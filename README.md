# DuDu Memo

DuDu Memo는 할 일과 메모를 관리할 수 있는 웹 애플리케이션입니다.

## 기능

- 사용자 인증 (로그인/회원가입)
- 할 일 관리 (추가, 수정, 삭제, 완료 표시)
- 하위 할 일 관리
- 메모 관리 (추가, 수정, 삭제)
- 캘린더 뷰

## 기술 스택

- Frontend: React, TypeScript, Tailwind CSS
- Backend: Node.js, Express
- Database: MongoDB
- 기타: Docker

## 실행 방법

### Docker를 사용하여 실행

1. Docker가 설치되어 있는지 확인합니다.

2. 프로젝트 루트 디렉토리에서 다음 명령어로 Docker 이미지를 빌드합니다:
   ```
   docker build -t dudu-memo .
   ```

3. 빌드된 이미지를 실행합니다:
   ```
   docker run -p 5001:5001 -e MONGODB_URI=your_mongodb_uri -e JWT_SECRET=your_jwt_secret dudu-memo
   ```

   `your_mongodb_uri`와 `your_jwt_secret`을 실제 값으로 교체해주세요.

4. 브라우저에서 `http://localhost:5001`로 접속하여 애플리케이션을 사용할 수 있습니다.

### 로컬에서 직접 실행

1. Node.js가 설치되어 있는지 확인합니다.

2. 프로젝트 루트 디렉토리에서 다음 명령어로 의존성을 설치합니다:
   ```
   npm install
   ```

3. `.env` 파일을 생성하고 필요한 환경 변수를 설정합니다:
   ```
   MONGODB_URI=your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   PORT=5001
   ```

4. 의존성 설치 및 빌드 :
   ```
   npm install
   npm run build
   npm run dev
   ```

5. 앱 실행:
   ```
   npm run dev
   ```

## 라이선스
이 프로젝트는 MIT 라이선스 하에 있습니다.