/**
 * Builds the shared YouTube embed URL used by learner-facing blocks.
 * `cc_load_policy=0` requests that captions are not enabled by default.
 */
export function getYoutubeEmbedUrl(videoId: string): string {
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    showinfo: "0",
    cc_load_policy: "0",
  });

  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
}
