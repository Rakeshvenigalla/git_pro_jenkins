package com.spaceinvaders;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * GameServlet - Handles routing for the Space Invaders web application.
 * Serves static files (HTML, CSS, JS) from the webapp directory.
 */
public class GameServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {

        String path = req.getServletPath();

        if (path == null || path.equals("/") || path.equals("")) {
            // Serve main game page
            resp.sendRedirect(req.getContextPath() + "/index.html");
            return;
        }

        // Serve static resources
        String resourcePath = path;
        InputStream is = getServletContext().getResourceAsStream(resourcePath);

        if (is == null) {
            resp.sendError(HttpServletResponse.SC_NOT_FOUND, "Resource not found: " + path);
            return;
        }

        // Set content type
        String contentType = getServletContext().getMimeType(resourcePath);
        if (contentType == null) {
            contentType = "application/octet-stream";
        }
        resp.setContentType(contentType);

        // Stream the resource
        try (OutputStream os = resp.getOutputStream()) {
            byte[] buffer = new byte[4096];
            int bytesRead;
            while ((bytesRead = is.read(buffer)) != -1) {
                os.write(buffer, 0, bytesRead);
            }
        } finally {
            is.close();
        }
    }
}
