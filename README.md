# 🚀 Space Invaders — Java Web Game

A classic Space Invaders game built with **Java Servlets** and **HTML5 Canvas**, deployable on **Apache Tomcat**.

---

## 📋 Features

- Classic alien grid (3 types: Squid, Crab, Octopus)
- Animated pixel-art sprites with 2-frame animation
- Destructible barriers / shields
- Alien bombs with increasing difficulty per level
- In-game sound effects (Web Audio API)
- Mobile touch controls + keyboard support
- **REST API** for live leaderboard (`GET/POST /api/scores`)
- Multi-level progression (aliens get faster each level)
- Retro scanline CRT aesthetic

---

## 🛠 Tech Stack

| Layer    | Technology                     |
|----------|-------------------------------|
| Backend  | Java 11 + Jakarta Servlet 5.0 |
| Build    | Maven 3.x                     |
| Server   | Apache Tomcat 10.x             |
| Frontend | HTML5 Canvas + Vanilla JS      |
| Styling  | CSS3 (no frameworks)           |

---

## 🚀 Getting Started

### Prerequisites

- Java 11+
- Maven 3.6+
- Apache Tomcat 10.x

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/space-invaders.git
cd space-invaders
```

### 2. Build the WAR file

```bash
mvn clean package
```

This produces `target/space-invaders.war`.

### 3. Deploy to Tomcat

**Option A — Copy WAR manually:**
```bash
cp target/space-invaders.war $CATALINA_HOME/webapps/
```
Then start Tomcat:
```bash
$CATALINA_HOME/bin/startup.sh   # Linux/Mac
$CATALINA_HOME/bin/startup.bat  # Windows
```

**Option B — Use Maven Tomcat plugin (dev mode):**
```bash
mvn tomcat7:run
```
Then open: [http://localhost:8080/space-invaders](http://localhost:8080/space-invaders)

---

## 🎮 How to Play

| Control          | Action       |
|------------------|-------------|
| `←` / `→` Arrow  | Move player |
| `A` / `D`        | Move player |
| `SPACE`          | Fire bullet |
| `P`              | Pause game  |
| `ENTER`          | Restart     |

Mobile touch buttons are also available on the screen.

---

## 📁 Project Structure

```
space-invaders/
├── pom.xml
└── src/
    └── main/
        ├── java/
        │   └── com/spaceinvaders/
        │       ├── GameServlet.java     # Routes & serves static files
        │       └── ScoreServlet.java    # REST API: GET/POST /api/scores
        └── webapp/
            ├── index.html               # Main game page
            ├── WEB-INF/
            │   └── web.xml              # Servlet mapping
            └── static/
                ├── js/
                │   └── game.js          # Full game engine (Canvas)
                └── css/
                    └── style.css        # Retro game styling
```

---

## 🔌 REST API

| Method | Endpoint     | Description                 |
|--------|--------------|-----------------------------|
| GET    | /api/scores  | Returns top 10 scores (JSON)|
| POST   | /api/scores  | Submit a new score          |

**POST body:**
```json
{
  "name": "PlayerName",
  "score": 1540
}
```

> ⚠️ Scores are stored **in-memory** and reset on server restart.  
> For persistence, swap `CopyOnWriteArrayList` in `ScoreServlet.java` with a database (e.g. H2, PostgreSQL).

---

## 🔧 Configuration

Edit `pom.xml` to change:
- `<port>` — default `8080`
- `<path>` — default `/space-invaders`

---

## 📦 Building for Production

```bash
mvn clean package -Pproduction
```

Deploy `target/space-invaders.war` to any Servlet 5.0-compatible container (Tomcat 10+, JBoss, Payara).

---

## 📝 License

MIT License — free to use, modify, and distribute.
