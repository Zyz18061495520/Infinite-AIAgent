# 使用node:20-slim作为基础镜像
FROM node:20-slim AS build-stage

# 设置工作目录
WORKDIR /app

# 安装pnpm
RUN npm install -g pnpm && echo "pnpm installed successfully"

# 打印版本信息以确认安装
RUN node --version && npm --version && pnpm --version

# 先复制锁定文件以更好地利用缓存
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./

# 确保pnpm安装过程不使用缓存且显示详细信息
RUN pnpm install --no-frozen-lockfile && echo "Dependencies installed successfully"

# 复制项目文件到容器中
COPY . .

# 确保文件已正确复制
RUN ls -la && echo "All files copied successfully"

# 执行构建并检查dist目录是否创建
RUN pnpm run build && ls -la dist && echo "Build completed successfully"

# 使用更轻量的镜像来运行构建后的应用
FROM nginx:1.23.1-alpine AS stage-2

# 创建目标目录
RUN mkdir -p /usr/share/nginx/html

# 将构建好的文件复制到Nginx的服务目录
COPY --from=build-stage /app/dist/ /usr/share/nginx/html/

# 覆盖 Nginx 配置，启用 history 路由 fallback
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 确保文件已正确复制
RUN ls -la /usr/share/nginx/html && echo "Files copied to nginx successfully"

# 暴露80端口
EXPOSE 80

# 启动Nginx
CMD ["nginx", "-g", "daemon off;"]
