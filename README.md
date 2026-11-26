# Mirror Fit · AI Trial Room

Take a photo of a person and a photo of a garment, say who is wearing it and what it is, and get back a picture of that person wearing the garment.

It is free to run: no AI API key and no billing. The browser sends the two photos straight to public AI demo servers on Hugging Face and shows the picture that comes back. The site keeps store logins and nothing else: no photos and no pictures.

## Logins

The trial room is behind a sign-in. There is no registration: a store asks for a login from the sign-in screen (name, store, phone), and we create it.

- `/admin` lists the requests and the stores that have a login. It opens with the admin key.
- Creating a login makes a password and shows it once, with a ready WhatsApp message for the store. A login can be turned off, given a new password, or deleted. Turning it off or resetting the password signs the store out everywhere.
- Logins and requests are small JSON files in a private Vercel Blob store. Passwords are stored hashed.

Environment variables on Vercel: `BLOB_READ_WRITE_TOKEN` (added by the Blob store), `ADMIN_KEY` and `SESSION_SECRET` (each 24 characters or more). For local work, `vercel env pull` brings the Blob token; add the other two to `.env.local` yourself.

The sign-in keeps other people out of the app. The try-on itself still runs between the browser and the public demo servers.

## The catalogue

The garment slot has a Catalogue button: 40 sample garments, five each of shirts, T-shirts, jackets and jeans, for men and for women. Picking one fills in the garment photo, who it is for and what it is, so only the person's photo is left to add.

- The list is in `src/lib/catalogue.ts`. Each garment is a 768 x 1024 photo on white in `public/catalogue/`, with a 384 x 512 copy in `public/catalogue/thumb/`.
- To add a garment, put the two files there under a name like `men-shirt-6.jpg` and add a line to the list. For a new garment type, add it to `CATALOGUE_TYPES` as well, using a type id from `src/lib/garments.ts`.
- The sample photos are computer-generated product shots, not real products of any brand. A store should replace them with photos of what it sells.

## The free limit

The demo servers give each network (IP address) a free allowance of GPU time per day. Measured on 24 Nov 2026 it was 180 seconds, and one top used about 20 seconds of it. Everyone on the same Wi-Fi shares the allowance; a phone on mobile data has its own.

Every garment type now runs on a server that asks for 60 seconds per try-on, so a run is refused once less than that is left. That should work out to six or seven try-ons a day per network; the figure is estimated from the numbers above, not counted.

When the allowance runs out the site says so and, where the server gives one, shows the time until it resets.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. The camera only works on `localhost` or over HTTPS.

## Deploy

A standard Next.js app. It needs the three environment variables listed under Logins. Pushing to `main` redeploys it on Vercel.

## How it works

| Path | Role |
| --- | --- |
| `src/components/TrialRoom.tsx` | The page: two photo slots, the choices, the result |
| `src/components/CameraModal.tsx` | In-browser camera with a 3:4 viewfinder |
| `src/lib/image.ts` | Shrinks photos in the browser before they are sent, and tidies the result |
| `src/lib/garments.ts` | Garment types and which garment area each maps to |
| `src/lib/catalogue.ts`, `src/components/CatalogueModal.tsx` | The sample catalogue and its picker |
| `src/lib/tryon.ts` | Calls the demo servers with `@gradio/client` |

Three servers are used. Each garment goes to the first one in its row, and to the next if that one fails:

| Garments | First | Then |
| --- | --- | --- |
| Tops | [yisol/IDM-VTON](https://huggingface.co/spaces/yisol/IDM-VTON) | [levihsu/OOTDiffusion](https://huggingface.co/spaces/levihsu/OOTDiffusion), then [franciszzj/Leffa](https://huggingface.co/spaces/franciszzj/Leffa) |
| Trousers, skirts, dresses | levihsu/OOTDiffusion | franciszzj/Leffa |

IDM-VTON and OOTDiffusion are licensed CC BY-NC-SA 4.0 (non-commercial); Leffa is MIT. Leffa asks for the whole day's allowance for one run, so it rarely gets to run and is only a last resort.

These are other people's public demos. They can be slow, queued, changed or taken offline without notice, and the two non-commercial licences do not allow commercial use.

## Photo tips

- Person: one person, standing straight, facing the camera, head to hips in view.
- Garment: laid flat or on a hanger, the whole garment in view, plain background.
