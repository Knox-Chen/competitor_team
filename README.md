# 竞品分析（前后端同仓）

本仓库为**单仓库**，目录结构：

```
├── frontend/     # React + TypeScript + Vite 前端
├── backend/      # FastAPI 本地代理（转发扣子 Coze stream_run）
└── README.md
```

## 前置要求

- Node.js 18+
- Python 3.10+（后端）

## 前端 `frontend/`

```bash
cd frontend
npm install
npm run dev
```

默认开发服务器：<http://localhost:3000>。  
若 `VITE_API_BASE_URL` 为空，请求会通过 Vite 代理转发到本地后端（见 `vite.config.ts`）。

复制环境变量示例：

```bash
copy .env.example .env   # Windows
# 或手动创建 .env
```

## 后端 `backend/`

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate    # Windows
pip install -r requirements.txt
```

复制 `backend/.env.example` 为 `backend/.env`，填写扣子相关变量后启动：

```bash
python main.py
```

默认监听：**5050**（与 `frontend/vite.config.ts` 代理一致）。

## 上传到 GitHub

1. 在 GitHub 新建**空仓库**（不要勾选自动添加 README）。
2. 在本仓库根目录执行：

```bash
git init
git add .
git commit -m "chore: initial monorepo (frontend + backend)"
git branch -M main
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

**注意：** `.env` 已被 `.gitignore` 忽略，请勿将密钥推送到远程。
