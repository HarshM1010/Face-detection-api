# 🎭 MERN Face Detection API

A modern MERN stack application (MongoDB, Express/NestJS, React/Next.js, Node.js) that detects faces in uploaded videos and draws bounding boxes (Regions of Interest) **entirely without OpenCV**.

![Architecture Diagram](./architecture.png)

## ✨ Features
- **Modern UI**: Built with Next.js and Tailwind CSS featuring a clean, responsive dark theme.
- **Robust Backend**: Built on top of NestJS providing scalable and maintainable REST APIs.
- **OpenCV-Free Processing**: 
  - Extracts frames using `fluent-ffmpeg`.
  - Detects faces using TensorFlow.js (`@tensorflow-models/face-detection`).
  - Draws bounding boxes using the HTML5 Canvas API (`canvas` package).
  - Re-stitches frames back into a `.mp4` video.
- **Storage**: Persists metadata and Region of Interest (ROI) data into MongoDB.
- **Containerized**: Fully containerized using Docker Compose for seamless deployment.

## 🛠️ Technologies Used
- **Frontend**: Next.js (React), Tailwind CSS, Lucide Icons
- **Backend**: NestJS, `@nestjs/mongoose`, `multer`
- **Video Processing**: `fluent-ffmpeg`
- **Face Detection**: `@tensorflow-models/face-detection` (TFJS-Node), Canvas API
- **Database**: MongoDB (Mongoose)
- **DevOps**: Docker, Docker Compose

## 📁 Folder Structure

```text
face-detection-api/
├── backend/                  # NestJS API
│   ├── src/                  
│   │   ├── video/            # Video upload, processing & ROI logic
│   │   ├── app.module.ts     # Main application module
│   │   └── main.ts           # NestJS bootstrap
│   ├── test/                 # E2E Tests
│   ├── Dockerfile            # Backend container definition
│   └── package.json          # Backend dependencies
├── frontend/                 # Next.js Application
│   ├── src/
│   │   └── app/              # Next.js App Router (Pages, Layout, Global CSS)
│   ├── public/               # Static assets
│   ├── Dockerfile            # Frontend container definition
│   └── package.json          # Frontend dependencies
├── docker-compose.yml        # Orchestrates Backend, Frontend, and MongoDB
├── .gitignore                # Git ignore rules
├── .env.example              # Environment variables template
└── README.md                 # Project documentation
```

## 🚀 Quick Start (Docker)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/HarshM1010/Face-detection-api.git
   cd Face-detection-api
   ```

2. **Configure Environment:**
   Copy `.env.example` to `.env` (if applicable) and adjust the variables to your needs.

3. **Run with Docker Compose:**
   ```bash
   docker-compose up --build
   ```

4. **Access the application:**
   - **Frontend**: [http://localhost:3000](http://localhost:3000)
   - **Backend API**: [http://localhost:3001](http://localhost:3001)
   - **MongoDB**: `localhost:27017`

## 📡 API Endpoints

### Video Routes
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/video/upload` | Upload a `.mp4` video for processing. Returns a video ID. |
| `GET` | `/video/:id/stream` | Stream the processed output video containing drawn bounding boxes. |
| `GET` | `/video/:id/roi` | Retrieve JSON data containing the bounding box (ROI) coordinates for each frame. |
| `GET` | `/video/:id/status` | Check the current processing status (`pending`, `processing`, `completed`, `failed`). |

## 💻 Local Development

If you prefer running without Docker, you can start the servers locally:

### Backend (NestJS)
```bash
cd backend
npm install
npm run start:dev
```
*(Make sure you have a local MongoDB instance running on port 27017)*

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```

## 📝 License
This project is licensed under the MIT License.
