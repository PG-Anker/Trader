import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
// Only import Vite in development
const isDevelopment = process.env.NODE_ENV === 'development';

let setupVite: any, serveStatic: any, log: any;

if (isDevelopment) {
  const viteModule = await import("./vite.js");
  setupVite = viteModule.setupVite;
  serveStatic = viteModule.serveStatic;
  log = viteModule.log;
} else {
  // Production log function
  log = (message: string, source = "express") => {
    const formattedTime = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit", 
      second: "2-digit",
      hour12: true,
    });
    console.log(`${formattedTime} [${source}] ${message}`);
  };
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enable CORS for production
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Session-ID');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Setup Vite in development or serve static files in production
  if (isDevelopment) {
    await setupVite(app, server);
  } else {
    // Production static file serving
    import('path').then(path => {
      import('express').then(express => {
        // Serve static files from dist/public
        app.use(express.static(path.join(process.cwd(), 'dist', 'public')));
        
        // Catch-all handler for SPA routing
        app.get('*', (req, res) => {
          res.sendFile(path.join(process.cwd(), 'dist', 'public', 'index.html'));
        });
      });
    });
  }

  // Use PORT environment variable or default to 5000 for development
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
