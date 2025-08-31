## Real-Time Chat App 💬

A real-time chat application built with Angular, WebSockets, and Node.js.
This project demonstrates how to implement instant, bidirectional communication between clients and a server using WebSockets.

## 🚀 Features
- Real-time messaging between multiple users
- WebSocket-based communication
- Simple and clean Angular frontend
- Node.js + ws WebSocket server
- Lightweight and fast

## 🛠️ Tech Stack
- Frontend: Angular
- Backend: Node.js, Express
- Real-time: WebSockets

## 📦 Installation & Setup
- Backend (Node.js)

```bash
cd server
npm install
npm start
```

- Frontend (Angular)
```bash
cd real-time-chat-app
npm install
ng serve OR ng serve -o
```

## NOTE!!!!!!!!!!!!!!!!

Проект размещён на Render (free tier). Так как использую бесплатную версию сервис автоматически останавливается через 15 минут бездействия и запускается заново при следующем запросе (cold start). То есть может занять несколько секунд чтобы приложение запускалось если кто-то не посещал веб приложение в течении 15 минут

<img width="1913" height="891" alt="image" src="https://github.com/user-attachments/assets/db917289-7d73-41ad-b623-5b91bd3ad1d1" />


## 📸 Demo

## DEVICE 1
- Register Form page

![WhatsApp Image 2025-08-31 at 18 48 19](https://github.com/user-attachments/assets/6d82a5b7-0307-4bf2-8d00-177605b4a822)

- Add username and password

![WhatsApp Image 2025-08-31 at 18 48 19 (1)](https://github.com/user-attachments/assets/aa376c16-bc07-4817-8ee0-71a68cbfd2b3)

- After successful registration, add a username and password and log in

![WhatsApp Image 2025-08-31 at 18 48 20 (1)](https://github.com/user-attachments/assets/8b137271-2b34-4aca-a0a3-90c8bf31172b)

- Chat page

![WhatsApp Image 2025-08-31 at 18 48 20 (2)](https://github.com/user-attachments/assets/d2554e53-4729-4e1b-923f-42ae34033015)


## DEVICE 2
- Sign Up another user

<img width="1913" height="897" alt="image" src="https://github.com/user-attachments/assets/a0e988cc-2f4e-43cb-b4dc-5941372351a9" />

## DEVICE 1
- Another username appeared (but OFFLINE)

![WhatsApp Image 2025-08-31 at 18 48 20 (3)](https://github.com/user-attachments/assets/612acfb7-3609-47cf-9985-3c2d295c55f9)

## DEVICE 2

- Log in

<img width="1913" height="895" alt="image" src="https://github.com/user-attachments/assets/8ff8f4c8-417d-4c5e-9c1b-552d040eb7f4" />

## DEVICE 1

- Another username changed status (ONLINE)

![WhatsApp Image 2025-08-31 at 18 48 20 (4)](https://github.com/user-attachments/assets/c3310550-6a62-403a-a057-afce41b2e14e)

## DEVICE 2
- Another user also appeared (ONLINE)

<img width="1908" height="894" alt="image" src="https://github.com/user-attachments/assets/bc2898f5-0573-430d-a654-a39c05336fce" />

- Send messages to each other (DEVICE 1 and DEVICE 2)

<img width="1915" height="901" alt="image" src="https://github.com/user-attachments/assets/97269d30-33bb-41f7-b5b2-a260afb25704" />
![WhatsApp Image 2025-08-31 at 18 48 21 (1)](https://github.com/user-attachments/assets/7e91ccff-2b21-4060-9293-c920e2bf360a)
![WhatsApp Image 2025-08-31 at 18 48 21 (2)](https://github.com/user-attachments/assets/38301d5d-2a7f-43e0-9801-34d8842caa4c)

## DEVICE 1
- When someone gets a message, it shows a notification

![WhatsApp Image 2025-08-31 at 18 48 21](https://github.com/user-attachments/assets/0af44701-0770-4cc9-9348-21ee4eaeff3b)


If logged out, then it immediately shows offline status
<img width="1915" height="895" alt="image" src="https://github.com/user-attachments/assets/9e004224-8d21-443c-a068-48f2c6ced881" />
