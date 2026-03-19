# 🛡️ RakshikaSphere — Women Safety Web App

<div align="center">



**A comprehensive AI-powered women safety platform built with the MERN stack.**

[Live Demo](https://rakshikasphere.vercel.app) · [Report Bug](https://github.com/code-ananya/RakshikaSphere/issues) · [Request Feature](https://github.com/code-ananya/RakshikaSphere/issues)

</div>

---

## 📋 Table of Contents

- [About](#about)
- [Features](#features)
- [ML Features](#ml-features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Screenshots](#screenshots)

---

## 🌟 About

**RakshikaSphere** is a women's safety web application designed to provide immediate help and support in distress situations. The platform enables users to send SOS signals, report incidents, access AI-powered danger zone predictions, and get safe route recommendations — all in one place.

---

## ✨ Features

### 🚨 SOS Emergency Button
- One-tap distress signal with automatic GPS location detection
- Instantly sends emergency email to registered contacts with live map location
- Works even when the user cannot make a call

### 📝 Incident Reporting
- Report incidents with description, pincode, address and media uploads
- Auto-captures GPS coordinates for accurate location mapping
- Media files stored securely on AWS S3

### 🔐 User Authentication
- Secure registration and login with JWT authentication
- Emergency contacts stored in user profile
- Personal and emergency contact management

### 👨‍💼 Admin Panel
- View and manage all reported incidents
- Review distress signals and emergency reports
- Mark incidents as seen/resolved

### 💬 AI Safety Chatbot
- Real-time chat support for safety queries
- Context-aware responses

---

## 🤖 ML Features

### 🗺️ Danger Zone Heatmap
- Uses **DBSCAN clustering** on historical incident data
- Predicts and visualizes high-risk areas on an interactive map
- Color-coded risk levels: Critical 🔴 High 🟠 Medium 🟡 Low 🟢
- Powered by **Python (scikit-learn) + Flask microservice**

### 😰 Distress Text Classifier
- Automatically classifies incident report severity (Low / Medium / High / Critical)
- Keyword-based NLP classifier with urgency detection
- Helps admin prioritize critical incidents instantly

### 📸 Violence Detection
- Analyzes uploaded media and report text for violence indicators
- Provides severity assessment and recommended action
- Supports both text and image analysis

### 🛣️ Safe Route Recommendation
- Suggests safer navigation routes based on danger zone data
- Compares multiple route options with safety scores
- Shows estimated time and distance for each route

### 📞 Fake Call Generator
- Triggers a realistic fake incoming call to escape unsafe situations
- Multiple caller options: Mom, Dad, Friend, Boss, Brother
- Hindi scripts for natural-sounding conversations

---

## 🛠️ Tech Stack

### Frontend
- **React.js** — UI framework
- **Bootstrap 5** — Responsive styling
- **Leaflet.js** — Interactive maps
- **Axios** — API communication
- **React Hot Toast** — Notifications

### Backend
- **Node.js + Express.js** — REST API server
- **MongoDB + Mongoose** — Database
- **JWT** — Authentication
- **Nodemailer** — Email notifications
- **AWS S3** — Media storage

### ML Service
- **Python + Flask** — ML microservice
- **scikit-learn** — DBSCAN clustering
- **NumPy** — Data processing
- **Gunicorn** — Production server

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- Python 3.10+
- MongoDB Atlas account
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/code-ananya/RakshikaSphere.git
cd RakshikaSphere
```

### 2. Install Backend Dependencies
```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

### 4. Install ML Service Dependencies
```bash
cd ../ml-service
pip install -r requirements.txt
```

### 5. Configure Environment Variables
Create a `.env` file in the `backend/` folder (see [Environment Variables](#environment-variables))

### 6. Run the Application

Open **3 terminals** and run:

**Terminal 1 — ML Service:**
```bash
cd ml-service
python app.py
# Runs on http://localhost:5001
```

**Terminal 2 — Backend:**
```bash
cd backend
node server.js
# Runs on http://localhost:5000
```

**Terminal 3 — Frontend:**
```bash
cd frontend
npm start
# Runs on http://localhost:3000
```

### 7. Open in Browser
```
http://localhost:3000
```

---

## ⚙️ Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Database
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/rakshikasphere

# Authentication
JWT_SECRET=your_jwt_secret_key
ACCESS_TOKEN_SECRET=your_access_token_secret

# Email (Nodemailer)
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password

# AWS S3
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=ap-south-1
AWS_BUCKET_NAME=your_bucket_name

# ML Service
ML_SERVICE_URL=http://localhost:5001

# Server
PORT=5000
```

---

## 📦 Deployment

### Frontend → Vercel
| Setting | Value |
|---|---|
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `build` |

### Backend → Render
| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Build Command | `npm install` |
| Start Command | `node server.js` |

### ML Service → Render
| Setting | Value |
|---|---|
| Root Directory | `ml-service` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `gunicorn app:app --host=0.0.0.0 --port=$PORT` |
| Environment | Python |

---

## 📁 Project Structure

```
RakshikaSphere/
├── frontend/                 # React.js frontend
│   ├── src/
│   │   ├── pages/            # App pages
│   │   ├── Components/       # Reusable components
│   │   ├── context/          # Auth context
│   │   └── styles/           # CSS files
│   └── package.json
│
├── backend/                  # Node.js backend
│   ├── controllers/          # Route controllers
│   ├── models/               # MongoDB models
│   ├── routes/               # API routes
│   ├── middlewares/          # Auth middleware
│   └── server.js
│
└── ml-service/               # Python ML microservice
    ├── app.py                # Unified ML service
    └── requirements.txt
```

---

## 🔗 API Endpoints

### User Routes
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/users/register` | Register new user |
| POST | `/api/v1/users/login` | Login user |
| PUT | `/api/v1/users/update` | Update profile |

### Incident Routes
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/incidents` | Report incident |
| GET | `/api/v1/incidents` | Get all incidents |

### Emergency Routes
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/emergency/emergencypressed` | Send SOS signal |

### ML Routes
| Method | Endpoint | Description |
|---|---|---|
| POST | `/predict` | Danger zone prediction |
| POST | `/classify` | Text severity classifier |
| POST | `/analyze/report` | Violence detection |
| POST | `/safe-route` | Safe route recommendation |
| GET | `/call/quick` | Fake call generator |

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
Made with ❤️ for Women Safety | RakshikaSphere © 2025
</div>
- Admins can access the admin panel by visiting /admin and log in using admin credentials.

**Screenshot**


