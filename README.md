# Real IDE Project

This project includes both frontend and backend components:

- **Frontend**: Built with Vite + React + TypeScript, using `pnpm`
- **Backend**: Built with Spring Boot (standard initializer)

---

##  Environment Requirements

| Component | Version Recommendation              |
|-----------|--------------------------------------|
| Node.js   | ≥ 18                                 |
| pnpm      | ≥ 8 (`npm install -g pnpm`)          |
| Java      | JDK 22 or compatible with your Spring Boot version |
| Maven     | ≥ 3.6 (optional if using IDE)        |

---

##  Frontend Setup (Vite + pnpm)

1. Navigate to the frontend directory:

   ```bash
   cd frontend/real-react
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Start the dev server:

   ```bash
   pnpm dev
   ```

4. Open your browser:

   ```
   http://localhost:5173
   ```

---

##  Backend Setup (Spring Boot)


### Run in IntelliJ IDEA (or any IDE)

1. Open the project `real-ide-backend`
2. Wait for dependencies to load
3. Run `RealIdeBackendApplication.java`

---

##  Frontend-Backend Integration

- The frontend expects API requests to `http://localhost:8080` (default Spring Boot port)
- If your backend runs on a different port, update the proxy settings in `vite.config.ts`

---

## 📝 Notes

- Backend CSV data is stored in `backend/real-ide-backend/databases/csv/`
- To build frontend for production:

   ```bash
   pnpm build
   ```

   Output will be in the `dist/` directory, ready for deployment (e.g., with Nginx)

---

## 📄 License

This project is for educational use.
