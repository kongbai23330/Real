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

    /* -------- Tunable parameters -------- */
    private static final int    TIMEOUT_MS = 4_000;   // Timeout per query (sliding)
    private static final String PROMPT     = ">>>";   // REAL prompt
    // Declared at the field level
    private static final java.util.regex.Pattern ANSI =
            java.util.regex.Pattern.compile("\u001B\\[[0-9;?]*[ -/]*[@-~]");
    private static final java.util.regex.Pattern PROMPT_LINE =
            java.util.regex.Pattern.compile("^\\$\\d+\\s+>>>.*$");
    /* -------- Process & Queue -------- */
    private Process                 real;
    private BufferedWriter          realIn;
    private final LinkedBlockingQueue<String> outQ = new LinkedBlockingQueue<>();
    private File lastLoadedJson = null;
    private volatile String firstHeader = null;
    /* ========== Start ========== */
    @PostConstruct
    public void start() throws Exception {

        File jar = new File("real-0.8-SNAPSHOT-with-deps.jar");
        if (!jar.exists()) throw new FileNotFoundException(jar.getAbsolutePath());

        /* Launch pseudo-terminal — make REAL think it's connected to TTY */
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

    /* ========== Query ========== */
    public String sendQuery(String expr) throws IOException {

        /* .command sent as-is; RA expression needs semicolon */
        if (!expr.startsWith(".")) expr = expr.trim().endsWith(";") ? expr : expr + ';';
        System.out.println("[DEBUG] Sending query: " + expr);
        System.out.println("[DEBUG] Char codes: " + expr.chars().mapToObj(i -> String.valueOf(i)).toList());

        realIn.write(expr + "\r\n");                // CRLF for immediate write
        realIn.flush();

        long deadline = System.currentTimeMillis() + TIMEOUT_MS;
        boolean firstPrompt = true;
        StringBuilder result = new StringBuilder();

        while (System.currentTimeMillis() < deadline) {
            String line = poll(deadline - System.currentTimeMillis());
            if (line == null) continue;

            if (line.trim().endsWith(PROMPT)) {
                if (firstPrompt) {                  // Instruction accepted
                    firstPrompt = false;
                    deadline = System.currentTimeMillis() + TIMEOUT_MS;
                    continue;
                }
                break;                              // Second >>> means done
            }
            if (result.length() > 0) result.append('\n');
            result.append(line);
            deadline = System.currentTimeMillis() + TIMEOUT_MS;   // sliding timeout
        }
        return result.length() == 0 ? "(no output)" : result.toString();
    }

    public void loadDatabase(File jsonFile) throws IOException {
        if (!jsonFile.exists()) throw new FileNotFoundException(jsonFile.getAbsolutePath());

        // ✅ Reset old state before loading (if .reset is supported)
        try {
            sendQuery(".reset");
        } catch (Exception e) {
            System.err.println("[REAL] .reset failed (maybe unsupported): " + e.getMessage());
        }

        // Load new JSON
        sendQuery(".load " + jsonFile.getAbsolutePath());

        // ✅ If you want to remember the path, keep this line:
        lastLoadedJson = jsonFile.getAbsoluteFile();
        firstHeader = null;
    }


    public void addTableFromCsv(String tableName, List<String> attrs, File csvFile) throws IOException {
        if (!csvFile.exists()) throw new FileNotFoundException(csvFile.getAbsolutePath());
        String attrList = String.join(", ", attrs);
        String path = csvFile.getAbsolutePath();
        sendQuery(".add " + tableName + "(" + attrList + ") : " + path);
    }

    /* ========== Shutdown ========== */
    @PreDestroy
    public void stop() { if (real != null) real.destroyForcibly(); }

    /* ---------- Utilities ---------- */

    /** Split stdout into lines (\r or \n); flush immediately on >>> */
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

        // ① Remove ANSI control characters
        s = ANSI.matcher(s).replaceAll("");

        // ② Remove lines with prompt echoes
        if (PROMPT_LINE.matcher(s).find()) {
            buf.setLength(0);
            return;
        }

        // ✅ More general: block all "number + ... + anything" echoes
        if (s.trim().matches("^\\d+\\s*\\.\\.\\.\\s*.*$")) {
            buf.setLength(0);
            return;
        }

        // ③ Remove echoed command lines
        if (s.trim().matches("^\\d+\\s+\\.\\w+(\\s+\\S+)?$")) {
            buf.setLength(0);
            return;
        }

        // ④ Remove control characters except newline/tab
        s = s.replaceAll("[\\p{Cntrl}&&[^\\r\\n\\t]]", "");

        // ✅ Remove all non-ASCII printable characters (including garbled symbols, boxes)
        s = s.replaceAll("[^\\x20-\\x7E\\r\\n\\t]", "");
        // Remove literal ASCII question marks
        s = s.replace("?", "");

        if (s.trim().equals("Q")) {
            buf.setLength(0);
            return;
        }

        String trimmed = s.trim();

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
