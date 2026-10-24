# Clearcut

Remove the background from any photo in seconds. Upload an image, get a transparent PNG, and pay for more credits when you run out.

## Stack

| Part | Tech |
|---|---|
| Client | React, Vite, Tailwind CSS, Clerk |
| API | Node.js, Express, MongoDB (Mongoose) |
| Background removal | ClipDrop API |
| Payments | Razorpay, Stripe |

## Project structure

```
clearcut/
├── client/   # React app
└── server/   # Express API
```

## Getting started

Requirements: Node.js 20+, a MongoDB server, a [Clerk](https://dashboard.clerk.com) application.

```bash
git clone https://github.com/Yusuf-Hussain25/clearcut.git
cd clearcut
npm install && npm run install:all

cp client/.env.example client/.env   # fill in the values
cp server/.env.example server/.env   # fill in the values

npm run dev                          # API on :4000, client on :5173
```

Every key is explained in the `.env.example` files.

## Author

Yusuf Hussain · https://github.com/Yusuf-Hussain25
