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

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:5173")
public class QueryController {

    private final RealProcessService real;

    public QueryController(RealProcessService real) {
        this.real = real;
    }

    /** Execution of queries */
    @PostMapping("/query")
    public ResponseEntity<String> run(@RequestBody Map<String, String> body) throws Exception {
        String expr = body.getOrDefault("expression", "");
        return ResponseEntity.ok(real.sendQuery(expr));
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
}
