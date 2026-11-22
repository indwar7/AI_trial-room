# AI Trial Room

Take a photo of a person and a photo of a garment, say who is wearing it and what it is, and get back a picture of that person wearing the garment.

The fitting is done by the [IDM-VTON](https://replicate.com/cuuupid/idm-vton) model on Replicate. The site itself stores nothing: photos go from the browser to the model and the finished picture comes back.

## Run it locally

```bash
npm install
cp .env.example .env.local   # then paste your Replicate token into it
npm run dev
```

Open http://localhost:3000. The camera only works on `localhost` or over HTTPS.

## Environment

| Variable | Required | What it is |
| --- | --- | --- |
| `REPLICATE_API_TOKEN` | yes | API token from https://replicate.com/account/api-tokens |

Every try-on is billed to that Replicate account. The site is open to anyone with the link, so set a monthly spend limit on the Replicate account.

## Deploy

The project deploys to Vercel as a standard Next.js app. Add `REPLICATE_API_TOKEN` under Project Settings, Environment Variables, then redeploy.

## How it works

| Path | Role |
| --- | --- |
| `src/components/TrialRoom.tsx` | The page: two photo slots, the choices, the result |
| `src/components/CameraModal.tsx` | In-browser camera with a 3:4 viewfinder |
| `src/lib/image.ts` | Shrinks photos in the browser before they are sent |
| `src/lib/garments.ts` | Garment types and which model category each maps to |
| `src/lib/replicate.ts` | Server-side Replicate client |
| `src/app/api/tryon/route.ts` | `POST` starts a try-on and returns its id |
| `src/app/api/tryon/[id]/route.ts` | `GET` reports progress, `DELETE` cancels |
| `src/app/api/tryon/[id]/download/route.ts` | Serves the finished picture as a file download |

The browser starts a try-on, then asks for its status every 1.5 seconds until the picture is ready. The first try-on after a quiet period is slower, because the model has to start up.

## Photo tips

- Person: one person, standing straight, facing the camera, head to hips in view.
- Garment: laid flat or on a hanger, the whole garment in view, plain background.
- The model's main weights are for tops (shirt, T-shirt, coat, jacket). Trousers, skirts and dresses run on its second, DressCode weights.
