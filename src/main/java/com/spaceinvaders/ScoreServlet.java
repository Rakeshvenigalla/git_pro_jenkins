package com.spaceinvaders;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * ScoreServlet - REST API to store and retrieve high scores.
 * GET  /api/scores       -> returns top 10 scores as JSON
 * POST /api/scores       -> submit a new score { "name": "...", "score": 1234 }
 */
public class ScoreServlet extends HttpServlet {

    // In-memory score store (thread-safe). Replace with DB for persistence.
    private static final List<ScoreEntry> scores = new CopyOnWriteArrayList<>();
    private static final int MAX_SCORES = 10;
    private final Gson gson = new Gson();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");
        resp.setHeader("Access-Control-Allow-Origin", "*");

        List<ScoreEntry> top = new ArrayList<>(scores);
        top.sort(Comparator.comparingInt(ScoreEntry::getScore).reversed());
        if (top.size() > MAX_SCORES) {
            top = top.subList(0, MAX_SCORES);
        }

        PrintWriter out = resp.getWriter();
        out.print(gson.toJson(top));
        out.flush();
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");
        resp.setHeader("Access-Control-Allow-Origin", "*");

        StringBuilder sb = new StringBuilder();
        try (BufferedReader reader = req.getReader()) {
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
        }

        try {
            JsonObject json = gson.fromJson(sb.toString(), JsonObject.class);
            String name = json.get("name").getAsString().trim();
            int score = json.get("score").getAsInt();

            // Sanitize name
            if (name.isEmpty() || name.length() > 20) {
                name = "Anonymous";
            }
            name = name.replaceAll("[^a-zA-Z0-9 _-]", "");

            scores.add(new ScoreEntry(name, score));

            JsonObject responseJson = new JsonObject();
            responseJson.addProperty("status", "ok");
            responseJson.addProperty("message", "Score saved!");

            PrintWriter out = resp.getWriter();
            out.print(gson.toJson(responseJson));
            out.flush();

        } catch (Exception e) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            JsonObject error = new JsonObject();
            error.addProperty("status", "error");
            error.addProperty("message", "Invalid score data.");
            PrintWriter out = resp.getWriter();
            out.print(gson.toJson(error));
            out.flush();
        }
    }

    @Override
    protected void doOptions(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        resp.setHeader("Access-Control-Allow-Origin", "*");
        resp.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        resp.setHeader("Access-Control-Allow-Headers", "Content-Type");
        resp.setStatus(HttpServletResponse.SC_OK);
    }

    /**
     * Represents a single score entry.
     */
    public static class ScoreEntry {
        private final String name;
        private final int score;
        private final long timestamp;

        public ScoreEntry(String name, int score) {
            this.name = name;
            this.score = score;
            this.timestamp = System.currentTimeMillis();
        }

        public String getName() { return name; }
        public int getScore() { return score; }
        public long getTimestamp() { return timestamp; }
    }
}
