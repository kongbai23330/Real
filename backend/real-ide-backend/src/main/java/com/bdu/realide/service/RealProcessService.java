package com.bdu.realide.service;

import com.pty4j.PtyProcess;
import com.pty4j.PtyProcessBuilder;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

@Service
public class RealProcessService {

    /* -------- 可调参数 -------- */
    private static final int    TIMEOUT_MS = 4_000;   // 单次查询滑动超时
    private static final String PROMPT     = ">>>";   // REAL 提示符
    // 放在类的 field 区域
    private static final java.util.regex.Pattern ANSI =
            java.util.regex.Pattern.compile("\u001B\\[[0-9;?]*[ -/]*[@-~]");
    private static final java.util.regex.Pattern PROMPT_LINE =
            java.util.regex.Pattern.compile("^\\$\\d+\\s+>>>.*$");
    /* -------- 进程 & 队列 -------- */
    private Process                 real;
    private BufferedWriter          realIn;
    private final LinkedBlockingQueue<String> outQ = new LinkedBlockingQueue<>();
    private File lastLoadedJson = null;

    /* ========== 启动 ========== */
    @PostConstruct
    public void start() throws Exception {

        File jar = new File("real-0.8-SNAPSHOT.jar");
        if (!jar.exists()) throw new FileNotFoundException(jar.getAbsolutePath());

        /* 伪终端启动 —— 让 REAL 认为自己连在 TTY 上 */
        List<String> cmd = List.of("java", "-jar", jar.getAbsolutePath());

        Map<String,String> env = new HashMap<>(System.getenv());
        env.putIfAbsent("NO_COLOR", "1");
        env.putIfAbsent("TERM",      "xterm");

        PtyProcess pty = new PtyProcessBuilder(cmd.toArray(String[]::new))
                .setEnvironment(env)
                .start();

        real   = pty;
        realIn = new BufferedWriter(
                new OutputStreamWriter(pty.getOutputStream(), StandardCharsets.UTF_8));
        InputStream rawOut = pty.getInputStream();

        new Thread(() -> tail(rawOut), "real-pty-tail").start();

        waitForPrompt(1_000);
        if (lastLoadedJson != null && lastLoadedJson.exists()) {
            sendQuery(".load " + lastLoadedJson.getAbsolutePath());
            System.out.println("[REAL] auto-reloaded last JSON from: " + lastLoadedJson);
        } else {
            System.out.println("[REAL] no previous JSON to reload or file missing.");
        }

        System.out.println("[REAL] interpreter READY (PTY)");
    }

    /* ========== 查询 ========== */
    public String sendQuery(String expr) throws IOException {

        /* .command 原样发送；RA 表达式补分号 */
        if (!expr.startsWith(".")) expr = expr.trim().endsWith(";") ? expr : expr + ';';

        realIn.write(expr + "\r\n");                // CRLF 立即写出
        realIn.flush();

        long deadline = System.currentTimeMillis() + TIMEOUT_MS;
        boolean firstPrompt = true;
        StringBuilder result = new StringBuilder();

        while (System.currentTimeMillis() < deadline) {
            String line = poll(deadline - System.currentTimeMillis());
            if (line == null) continue;

            if (line.trim().endsWith(PROMPT)) {
                if (firstPrompt) {                  // 指令已接收
                    firstPrompt = false;
                    deadline = System.currentTimeMillis() + TIMEOUT_MS;
                    continue;
                }
                break;                              // 第二次 >>> 结束
            }
            if (result.length() > 0) result.append('\n');
            result.append(line);
            deadline = System.currentTimeMillis() + TIMEOUT_MS;   // 滑动超时
        }
        return result.length() == 0 ? "(no output)" : result.toString();
    }
    public void loadDatabase(File jsonFile) throws IOException {
        if (!jsonFile.exists()) throw new FileNotFoundException(jsonFile.getAbsolutePath());

        // ✅ 每次加载前先清空旧状态（如果支持 .reset）
        try {
            sendQuery(".reset");
        } catch (Exception e) {
            System.err.println("[REAL] .reset failed (maybe unsupported): " + e.getMessage());
        }

        // 加载新 JSON
        sendQuery(".load " + jsonFile.getAbsolutePath());

        // ✅ 如果你要记住路径，可以保留这一行：
        lastLoadedJson = jsonFile.getAbsoluteFile();
    }


    public void addTableFromCsv(String tableName, List<String> attrs, File csvFile) throws IOException {
        if (!csvFile.exists()) throw new FileNotFoundException(csvFile.getAbsolutePath());
        String attrList = String.join(", ", attrs);
        String path = csvFile.getAbsolutePath();
        sendQuery(".add " + tableName + "(" + attrList + ") : " + path);
    }

    /* ========== 关闭 ========== */
    @PreDestroy
    public void stop() { if (real != null) real.destroyForcibly(); }

    /* ---------- 工具 ---------- */

    /** 把 stdout 拆成行（\r 或 \n）；遇到 >>> 也即刻 flush */
    private void tail(InputStream in) {
        StringBuilder buf = new StringBuilder();
        try {
            int b;
            while ((b = in.read()) != -1) {
                char c = (char) b;
                if (c == '\r' || c == '\n') { flush(buf); continue; }
                buf.append(c);
                if (buf.toString().endsWith(PROMPT)) flush(buf);
            }
        } catch (IOException ignore) { }
    }

    private void flush(StringBuilder buf) {
        if (buf.length() == 0) return;
        String s = buf.toString();

        // ① 去掉 ANSI 控制符
        s = ANSI.matcher(s).replaceAll("");

        // ② 去掉带 prompt 的前缀行
        if (PROMPT_LINE.matcher(s).find()) {
            buf.setLength(0);
            return;
        }

        // ✅ 更通用：屏蔽所有 “数字 + ... + 任意内容” 的回显
        if (s.trim().matches("^\\d+\\s*\\.\\.\\.\\s*.*$")) {
            buf.setLength(0);
            return;
        }


        // ③ 去掉回显命令行
        if (s.trim().matches("^\\d+\\s+\\.\\w+(\\s+\\S+)?$")) {
            buf.setLength(0);
            return;
        }

        // ④ 清除除换行/制表外的控制字符
        s = s.replaceAll("[\\p{Cntrl}&&[^\\r\\n\\t]]", "");

// ✅ 彻底删除所有非 ASCII 可打印字符（包括乱码、问号、方块等）
        s = s.replaceAll("[^\\x20-\\x7E\\r\\n\\t]", "");
// 删除所有 ASCII 问号（真正的 ?）
        s = s.replace("?", "");




        outQ.offer(s);
        buf.setLength(0);
    }


    private String poll(long ms) {
        try { return outQ.poll(ms, TimeUnit.MILLISECONDS); }
        catch (InterruptedException ie) { Thread.currentThread().interrupt(); return null; }
    }

    private void waitForPrompt(long maxMs) {
        long end = System.currentTimeMillis() + maxMs;
        while (System.currentTimeMillis() < end) {
            String l = poll(end - System.currentTimeMillis());
            if (l != null && l.trim().endsWith(PROMPT)) break;
        }
    }
}
