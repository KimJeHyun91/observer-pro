# OBSERVER - 통합관제시스템

## 프로젝트 개요

<div style="display: flex; align-items: center; margin-bottom: 20px;">
  <img src="./public/img/logo/logo-light-full.png" width="300px"> <h1 style="font-size: 60px; border-bottom: none; align-self: end;">OBSERVER
  </h1>
</div>

---

기존의 물리보안 시스템이 가지고 있는 단순한 영상감시와 출입제어로 그치는 것이 아니라 선별적인 이벤트 상황 알람을 통해 관제 편의성을 높인 운영 환경을 제공하고 있으며,
재난 상황 대응, 주차 및 차량 관제, 외부로부터의 침입 감지, 위험 인물의 출입 제어 등 유기적인 솔루션의 결합을 통해 혁신적인 통합관제 환경을 제공합니다.

## 설치 가이드

### 1. 필수 요구 사항
 - **Node.js** :  v16 이상 ( **LTS 권장** )
 - **npm** : v7 이상 또는 **yarn**

### 2. 프로젝트 복제
```bash
git clone <repository-url>
cd observer
```

### 3. 의존성 설치
```bash
npm install
# 또는 yarn
yarn install
```

## 개발 환경 실행
```bash
npm run dev
# 또는 yarn
yarn dev
```
Vite 개발 서버가 실행되며, 브라우저에서 프로젝트를 확인할 수 있습니다. 기본 URL은 http://localhost:5173 입니다.

## 배포 가이드

### 1. 빌드
```bash
npm run build
# 또는 yarn
yarn build
```
생성된 dist 폴더가 배포 파일을 포함합니다.

### 2. 배포 환경에서 미리보기
```bash
npm run preview
# 또는 yarn
yarn preview
```
이 명령어를 통해 빌드된 파일을 로컬에서 미리 확인할 수 있습니다.

### 3. 정적 서버에 배포
빌드된 `dist` 폴더를 정적 파일 호스팅 서버에 업로드 합니다. 

## 코드 스타일 검사 및 자동 수정
### 코드 스타일 검사
```bash
npm run prettier
npm run lint
```
### 코드 스타일 자동 수정
```
npm run format
```

## 주요 의존성
- **React** : ^18.3.1
- **Vite** : ^5.4.11
- **TypeScript** : ^5.6.2
- **TailwindCSS** : ^3.4.10
- **Zustand** : ^4.5.5
- **FullCalendar** : ^6.1.15
- **D3.js** : ^4.0.2


## Template

### Ecme - The Ultimate React, Vite & TypeScript Web Template
Ecme is a modern and responsive admin dashboard template built with React and TypeScript. Designed to provide a highly customizable and easy-to-use platform for building admin interfaces, it includes a variety of reusable components, pre-designed pages, and dynamic features.

This template is perfect for developing dashboards, web applications, CRM systems, e-commerce backends, and more. Whether you're building a small-scale admin panel or a large-scale enterprise application, Ecme is designed to be flexible and scalable.

Key Features:
- **Responsive Layout**: Optimized for all screen sizes and devices.
- **Dark/Light Mode**: Easily switch between light and dark themes.
- **Configurable Themes**: Personalize colors, layouts, and more to fit your needs.
- **Built with React + TypeScript**: Ensures robust type-checking and fast development.
- **Multi-Locale Support**: Easily add and manage multiple languages.
- **RTL Support**: Full Right-to-Left support for languages like Arabic or Hebrew.
- **Tailwind Component-Based Architecture**: Reusable components to streamline your development process.
- **API Ready**: Simple integration with any RESTful API.

### Template Demo
Check out the [Live Demo](https://ecme-react.themenate.net/) to explore the template in action.


### Template Guide
Please visit our [Online documentation](https://ecme-react.themenate.net/guide/documentation/introduction) for detailed guides, setup instructions, and customization options.

