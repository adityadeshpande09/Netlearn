import { permanentRedirect } from "next/navigation";

// Preserve old bookmarks without exposing the retired topology builder.
export default function PlaygroundPage() {
  permanentRedirect("/labs/troubleshooting");
}
