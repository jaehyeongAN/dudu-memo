# 빌드 단계
FROM node:18 AS build

WORKDIR /app

# 의존성 설치
COPY package*.json ./
RUN npm install

# 소스 코드 복사 및 빌드
COPY . .
RUN npm run build

# 실행 단계
FROM node:18-slim

WORKDIR /app

# 빌드된 파일과 서버 파일 복사
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.js .
COPY --from=build /app/package*.json ./

# 프로덕션 의존성만 설치
RUN npm install --only=production

# 환경 변수 설정
ENV PORT=5001

# 포트 노출
EXPOSE 5001

# 서버 실행
CMD ["node", "server.js"]