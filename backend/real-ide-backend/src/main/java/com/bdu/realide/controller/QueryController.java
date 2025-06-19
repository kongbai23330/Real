package com.bdu.realide.controller;

import com.bdu.realide.service.RealProcessService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.*;
import java.util.regex.Pattern;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

import java.time.LocalDate;

import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

import java.util.stream.Collectors;
import java.util.stream.Stream;
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:5173")
public class QueryController {

    private final RealProcessService real;
    private static final Pattern MANY_COL_HDR  =
            Pattern.compile("^[A-Za-z_][A-Za-z0-9_]*(\\s{2,}[A-Za-z_][A-Za-z0-9_]*)+$");
    private static final Pattern SINGLE_COL_HDR=
            Pattern.compile("^[A-Za-z_][A-Za-z0-9_]*$");
    public QueryController(RealProcessService real) {
        this.real = real;
    }

    /** Execution of queries */

    @PostMapping("/query")
    public ResponseEntity<String> run(@RequestBody Map<String,String> body) throws Exception {
        String expr   = body.getOrDefault("expression", "").trim();
        String output = real.sendQuery(expr);

        if (!expr.startsWith(".")) {
            List<String> lines = Arrays.stream(output.split("\\R"))
                    .map(String::trim)
                    .filter(l -> !l.isEmpty())
                    .toList();


            Optional<String> sql =
                    lines.stream().filter(l -> l.matches("(?i)^(select|with|insert|update|delete)\\b.*"))
                            .findFirst();

            if (sql.isEmpty() && expr.matches("[A-Za-z_][A-Za-z0-9_]*"))
                sql = Optional.of("SELECT * FROM " + expr);

            return ResponseEntity.ok(sql.orElse("(no SQL found)"));
        }
        return ResponseEntity.ok(output);   // 系统命令
    }




    /** Load database + extract table structure (new interface after merge) */
    @PostMapping("/load")
    public ResponseEntity<Map<String, Object>> loadAndExtract(@RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No file uploaded."));
        }

 
        File tempFile = File.createTempFile("real-db-", ".json");
        file.transferTo(tempFile);

        // .load 
        real.loadDatabase(tempFile);

     
        ObjectMapper mapper = new ObjectMapper();
        JsonNode root = mapper.readTree(tempFile);
        JsonNode tablesNode = root.path("tables");

        List<Map<String, Object>> tables = new ArrayList<>();
        tablesNode.fieldNames().forEachRemaining(tableName -> {
            JsonNode table = tablesNode.path(tableName);
            JsonNode attrs = table.path("attributes");

            List<String> attrNames = new ArrayList<>();
            attrs.fieldNames().forEachRemaining(attrNames::add);

            Map<String, Object> tableInfo = new LinkedHashMap<>();
            tableInfo.put("name", tableName);
            tableInfo.put("attributes", attrNames);
            tables.add(tableInfo);
        });

        Map<String, Object> result = new HashMap<>();
        result.put("message", "Database loaded successfully.");
        result.put("tables", tables);
        return ResponseEntity.ok(result);
    }



    @PostMapping("/query/table")
    public ResponseEntity<Map<String,Object>> runAndParse(
            @RequestBody Map<String,String> body) throws Exception {

        String expr   = body.getOrDefault("expression","");
        String output = real.sendQuery(expr);


        List<String> lines = Arrays.stream(output.split("\\R"))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .filter(s -> !s.toUpperCase().startsWith("SELECT"))   // 删掉 SQL echo
                .toList();

        if (lines.size() < 2)
            return ResponseEntity.ok(Map.of("attributes", List.of(),
                    "records",    List.of()));


        String headerLine      = lines.get(0);
        String headerNorm      = headerLine.replaceAll("\\s+"," ").trim();
        boolean multiCol       = headerLine.contains("  ");
        String colSplit        = multiCol ? "\\s{2,}" : "\\s+";
        String[] attrs         = headerLine.split(colSplit);

        List<List<String>> rows = new ArrayList<>();
        for (int i = 1; i < lines.size(); i++) {
            String l        = lines.get(i);
            String lNorm    = l.replaceAll("\\s+"," ").trim();             // ⚠️ 统一空格

            if (lNorm.equalsIgnoreCase(headerNorm))
                continue;

            if (multiCol && !l.contains("  "))
                continue;

            String[] parts = l.split(colSplit, attrs.length); // keep “Computer Science”
            if (parts.length == attrs.length)
                rows.add(List.of(parts));
        }


        return ResponseEntity.ok(Map.of(
                "attributes", List.of(attrs),
                "records",    rows
        ));
    }




    @PostMapping("/views")
    public ResponseEntity<List<Map<String, String>>> listViews() throws Exception {
        String output = real.sendQuery(".views");

        List<Map<String, String>> views = Arrays.stream(output.split("\\R"))
                .map(String::trim)
                .filter(line -> line.contains("="))
                .map(line -> {
                    String[] parts = line.split("=", 2);
                    if (parts.length < 2) return null;
                    return Map.of(
                            "name", parts[0].trim(),
                            "definition", parts[1].trim()
                    );
                })
                .filter(Objects::nonNull)
                .toList();

        return ResponseEntity.ok(views);
    }


    @PostMapping("/export-bundle")
    public ResponseEntity<byte[]> exportBundle(@RequestBody Map<String,String> body) throws Exception {


        Path dbPath = Files.createTempFile("real-db-", ".json");
        real.sendQuery(".save " + dbPath.toAbsolutePath());

        String views = real.sendQuery(".views");
        String viewDefines = Arrays.stream(views.split("\\R"))
                .filter(l -> l.contains("="))
                .map(l -> ".define " + l.trim())
                .collect(Collectors.joining("\n"));


        String expr = body.getOrDefault("expression", "").trim();
        String script = """
            .load %s
            %s

            %s
            """.formatted(dbPath.getFileName(),
                viewDefines,
                expr.isEmpty() ? "-- no query --" : expr);


        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos, StandardCharsets.UTF_8)) {

            // db.json
            zos.putNextEntry(new ZipEntry(dbPath.getFileName().toString()));
            Files.copy(dbPath, zos);
            zos.closeEntry();

            // script.ra
            zos.putNextEntry(new ZipEntry("bundle.ra"));
            zos.write(script.getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();
        }

        byte[] zipBytes = baos.toByteArray();
        return ResponseEntity.ok()
                .header("Content-Disposition",
                        "attachment; filename=\"real-bundle-%s.zip\""
                                .formatted(LocalDate.now()))
                .contentType(org.springframework.http.MediaType.APPLICATION_OCTET_STREAM)
                .body(zipBytes);
    }
    @PostMapping("/import-bundle")
    public ResponseEntity<String> importBundle(@RequestParam("file") MultipartFile bundle)
            throws Exception {

        if (bundle.isEmpty())
            return ResponseEntity.badRequest().body("empty upload");


        Path tmpDir = Files.createTempDirectory("real-bundle-");
        try (ZipInputStream zis =
                     new ZipInputStream(bundle.getInputStream(), StandardCharsets.UTF_8)) {

            ZipEntry e;
            while ((e = zis.getNextEntry()) != null) {
                Path out = tmpDir.resolve(e.getName()).normalize();
                Files.copy(zis, out, StandardCopyOption.REPLACE_EXISTING);
            }
        }


        Optional<Path> json = Files.list(tmpDir)
                .filter(p -> p.getFileName().toString().endsWith(".json"))
                .findFirst();
        if (json.isEmpty())
            return ResponseEntity.badRequest().body("no db json in bundle");
        real.loadDatabase(json.get().toFile());


        Path script = tmpDir.resolve("bundle.ra");
        String lastQuery = null;

        if (Files.exists(script)) {
            List<String> lines = Files.readAllLines(script, StandardCharsets.UTF_8);

            for (String l : lines) {
                l = l.trim();
                if (l.isEmpty() || l.startsWith("--")) continue;

                if (l.startsWith(".define"))
                    real.sendQuery(l);
                else
                    lastQuery = l;
            }
            if (lastQuery != null) real.sendQuery(lastQuery);
        }


        String raQuery = lastQuery == null ? "" : lastQuery;
        return ResponseEntity.ok()
                .contentType(org.springframework.http.MediaType.TEXT_PLAIN)
                .body(raQuery);
    }


}
