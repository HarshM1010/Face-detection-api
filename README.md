# MERN Face Detection API

A modern MERN stack application (MongoDB, NestJS, Next.js) that detects faces in uploaded videos and draws bounding boxes (Regions of Interest) entirely without OpenCV.

## Technologies Used
- **Frontend**: Next.js (React), Tailwind CSS, Lucide Icons
- **Backend**: NestJS, @nestjs/mongoose, multer
- **Video Processing**: fluent-ffmpeg (for frame extraction & stitching)
- **Face Detection**: @tensorflow-models/face-detection (TFJS-Node), Canvas API
- **Database**: MongoDB (Mongoose)

## Requirements
- Docker and Docker Compose

## Quick Start
1. Ensure Docker Desktop is running.
2. In the root directory, run:
   ```bash
   docker-compose up --build
   ```
3. Access the application:
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:3001
   - **Database**: localhost:27017

## API Endpoints
- `POST /video/upload` - Upload a `.mp4` video.
- `GET /video/:id/stream` - Stream the processed output video.
- `GET /video/:id/roi` - Retrieve JSON bounding box data.
- `GET /video/:id/status` - Check the processing status.
