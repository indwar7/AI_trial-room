# Mirror Fit · AI Trial Room

Choose a garment design, photograph the fabric, photograph the customer, and get back a picture of the customer wearing that design made in that fabric.

It is free to run: no AI API key and no billing. The browser sends the two photos straight to public AI demo servers on Hugging Face and shows the picture that comes back. The site keeps store logins and nothing else: no photos and no pictures.

## Logins

The trial room is behind a sign-in. There is no registration: a store asks for a login from the sign-in screen (name, store, phone), and we create it.

- `/admin` lists the requests and the stores that have a login. It opens with the admin key.
- Creating a login makes a password and shows it once, with a ready WhatsApp message for the store. A login can be turned off, given a new password, or deleted. Turning it off or resetting the password signs the store out everywhere.
- Logins and requests are small JSON files in a private Vercel Blob store. Passwords are stored hashed.

Environment variables on Vercel: `BLOB_READ_WRITE_TOKEN` (added by the Blob store), `ADMIN_KEY` and `SESSION_SECRET` (each 24 characters or more). For local work, `vercel env pull` brings the Blob token; add the other two to `.env.local` yourself.

The sign-in keeps other people out of the app. The try-on itself still runs between the browser and the public demo servers.

## Garment, fabric, customer, result

The trial room has four parts. On a wide screen they sit side by side and nothing scrolls; on a phone they are four steps with the main button always at the bottom.

1. **The garment.** A catalogue of designs: five each of shirts, T-shirts, jackets and trousers, for men and for women. A design is a cut, not a finished garment: classic collar, mandarin collar, Nehru jacket, pleated trousers and so on.
2. **The fabric.** A photo of the store's own fabric, taken or uploaded, or one of twelve samples. The moment a fabric is chosen, every design in the catalogue is shown made in it. A slider sets how big the fabric's pattern sits on the garment.
3. **The customer.** A photo, taken or uploaded.
4. **The fitted look.** The customer wearing that design in that fabric.

### How a fabric becomes a garment

This happens in the browser, in `src/lib/fabric.ts`, and costs nothing. Each design is a template: a picture whose transparency is the garment's outline and whose grey levels are its folds, seams and buttons. The fabric photo is evened out, mirrored so it repeats without a seam, laid across the picture, multiplied by the template and cut to its outline. That picture is what goes to the try-on server as the garment.

- Designs are listed in `src/lib/catalogue.ts`; their templates are in `public/designs/` (768 x 1024, with half-size copies in `thumb/`).
- To add a design, photograph or generate one plain medium-grey garment laid flat on white, run `python3 tools/make-design-template.py photo.jpg men-shirt-6`, and add a line to the list.
- The sample fabrics in `public/fabrics/` were drawn by a script, and the design templates were made from computer-generated photos of plain grey garments. Neither shows a real product of any brand.

## The free limit

The demo servers give each network (IP address) a free allowance of GPU time per day. Measured on 24 Nov 2026 it was 180 seconds, and one top used about 20 seconds of it. Everyone on the same Wi-Fi shares the allowance; a phone on mobile data has its own.

A try-on is refused once less allowance is left than the server asks for up front: 60 seconds for tops (IDM-VTON) and 90 seconds for trousers, skirts and dresses (OOTDiffusion, measured on 27 Nov 2026). That should work out to about six tops a day per network, or fewer when trousers are in the mix; the figures are estimated from these numbers, not counted.

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
| `src/components/TrialRoom.tsx` | The trial room: the four panes, the steps on a phone, the result |
| `src/components/CameraModal.tsx` | In-browser camera with a 3:4 viewfinder |
| `src/lib/image.ts` | Shrinks photos in the browser before they are sent, and tidies the result |
| `src/lib/garments.ts` | Garment types and which garment area each maps to |
| `src/lib/catalogue.ts`, `src/components/GarmentPane.tsx` | The designs and the pane that shows them |
| `src/lib/fabric.ts`, `src/components/FabricPane.tsx`, `DesignPreview.tsx` | Turning a fabric photo into a garment, and the fabric step |
| `src/components/PhotoButtons.tsx` | Camera and upload buttons, used for the customer and for the fabric |
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
- Fabric: flat and close, filling the frame, in even light. A crease or a shadow in the photo will repeat across the garment.
