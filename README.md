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

---

## 在 Render 上部署后端（推荐顺序：先后端、再前端）

1. **先部署后端**拿到公网 API 地址，再把前端的 `VITE_API_BASE_URL` 指过去（或构建时注入）。
2. 登录 [Render](https://render.com) → **New +** → **Web Service**，连接本 GitHub 仓库。
3. 配置示例：
   - **Root Directory**：`backend`（单仓里的子目录）
   - **Runtime**：Python 3（版本可由 `backend/runtime.txt` 指定）
   - **Build Command**：`pip install -r requirements.txt`
   - **Start Command**：`uvicorn main:app --host 0.0.0.0 --port $PORT`
4. 在 **Environment** 里添加（与本地 `backend/.env` 一致，值在 Dashboard 里填，勿提交仓库）：
   - `COZE_REMOTE_ENDPOINT`
   - `COZE_REMOTE_TOKEN`（若有）
   - `COZE_PROJECT_ID`
   - `COZE_SESSION_ID`
   - `CORS_ORIGINS`：你的**线上前端**完整 origin，例如 `https://xxx.onrender.com` 或 Vercel 域名（多个用英文逗号分隔）
5. 部署完成后会得到类似 `https://competitor-team-api.onrender.com` 的地址。健康检查：<https://你的服务.onrender.com/health>。
6. **前端**：把 `frontend/.env.production`（或 CI 环境变量）设为  
   `VITE_API_BASE_URL=https://你的服务.onrender.com`  
   然后构建并部署静态站点（Vite `npm run build` 产物可放 Render Static、Vercel、GitHub Pages 等）。

可选：使用仓库根目录的 `render.yaml` 在 Render **Blueprints** 里一键创建服务（首次仍要在 Dashboard 补全密钥类环境变量）。

**说明：** Render 免费实例会休眠，首次请求可能较慢；竞品分析请求若超过平台超时，需在 Render 或代码里评估超时时间。

---

## 在 Vercel 上部署前端

1. 登录 [Vercel](https://vercel.com) → **Add New…** → **Project** → 导入同一 GitHub 仓库。
2. **重要**：在 **Root Directory** 里点 **Edit**，选 **`frontend`**（单仓子目录，不要用车根目录）。
3. **Framework Preset** 一般为 **Vite**（自动识别）；确认：
   - **Build Command**：`npm run build`（或 `pnpm install && pnpm build`）
   - **Output Directory**：`dist`
4. 任选一种对接方式（二选一即可）：

   **方式 A：浏览器直连 Render（常见）**  
   - 在 Vercel **Environment Variables** 里设置 **`VITE_API_BASE_URL`** = 你的 Render 根地址，例如 `https://competitor-team.onrender.com`（不要末尾 `/`；改后需 **Redeploy**）。  
   - 在 Render 里配置 **`CORS_ORIGINS`**（你的 `https://xxx.vercel.app`）并已部署后端 CORS 修复；自定义域名也要写进 `CORS_ORIGINS`。

   **方式 B：Vercel 反向代理（绕过浏览器对 Render 的跨域）**  
   - 编辑 `frontend/vercel.json` 里的 `destination`，改成与你的 Render 服务 **完全一致** 的 `https://xxx.onrender.com/api/:path*`。  
   - 在 Vercel **删除** `VITE_API_BASE_URL`（或留空），让前端请求**同源** `/api/...`，由 Vercel 转发到 Render。  
   - **注意：** 分析耗时很长时，Vercel 代理可能有**请求超时**，长任务仍建议用方式 A 并修好 CORS。

5. 若后端需要鉴权且前端用了 `VITE_API_TOKEN`，在 Vercel 一并配置（与本地 `.env` 一致）。
6. 点 **Deploy**。部署完成后会得到 `https://xxx.vercel.app`。
7. 若用 **方式 A**，在 Render 的 **`CORS_ORIGINS`** 里加上 Vercel 地址（完整 origin），保存后必要时 **Manual Deploy** 后端。
8. 用浏览器做一次完整分析自测。

**提示：** 本地 `vite.config.ts` 的 **proxy 仅在 `npm run dev` 生效**；线上要么 **`VITE_API_BASE_URL`**，要么 **`vercel.json` 代理**。

### 若控制台出现 `POST ... onrender.com net::ERR_FAILED`

1. 打开 **开发者工具 → Network**，看是否有一条 **OPTIONS** 失败（多为 CORS）：确认 Render 已部署最新后端，且 **`CORS_ORIGINS` / `CORS_VERCEL_REGEX`** 覆盖你的 Vercel 域名。  
2. 用浏览器直接打开：`https://你的服务.onrender.com/health` ，确认服务已唤醒。  
3. 尝试 **方式 B**（`vercel.json` + 去掉 `VITE_API_BASE_URL`）排除跨域问题。  
4. 关闭广告拦截、换网络/设备试一次。
