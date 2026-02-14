import Nav from "@/components/Nav";
import path from "path";
import { readdir } from "fs/promises";

function isImage(file: string) {
  return /\.(png|jpe?g|gif|webp)$/i.test(file);
}

async function listImages(folderName: string) {
  const dir = path.join(process.cwd(), "public", folderName);

  let files: string[] = [];
  try {
    files = await readdir(dir);
  } catch {
    // folder missing or empty is fine
    return [];
  }

  return files
    .filter(isImage)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((f) => `/${folderName}/${encodeURIComponent(f)}`);
}

export default async function CulturePage() {
  const images = await listImages("culture");

  return (
    <main className="container" style={{ paddingTop: 28 }}>
      <Nav />

      <div className="card">
        <div className="h1">Culture</div>
        <div className="small" style={{ opacity: 0.85 }}>
          Photos, moments, artifacts, and the living spirit of the Society.
        </div>

        <div className="spacer" />

        {images.length === 0 ? (
          <div className="small">No images found yet. Add files to /public/culture.</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            {images.map((src) => (
              <a
                key={src}
                href={src}
                target="_blank"
                rel="noreferrer"
                className="card subtle"
                style={{
                  padding: 0,
                  overflow: "hidden",
                  background: "color-mix(in srgb, var(--bg) 92%, black)",
                }}
              >
                <img
                  src={src}
                  alt=""
                  style={{
                    width: "100%",
                    height: 180,
                    objectFit: "cover",
                    display: "block",
                  }}
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
