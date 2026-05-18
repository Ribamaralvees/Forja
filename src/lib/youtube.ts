export interface VideoResult {
  video_id: string | null;
  video_title: string | null;
  video_url: string;
}

/**
 * Busca um video de receita no YouTube. Se a YOUTUBE_API_KEY nao estiver
 * configurada, retorna um link de busca como fallback.
 */
export async function searchYouTube(query: string): Promise<VideoResult> {
  const key = process.env.YOUTUBE_API_KEY;
  const searchUrl =
    "https://www.youtube.com/results?search_query=" +
    encodeURIComponent(query + " receita fit");

  if (!key) {
    return { video_id: null, video_title: null, video_url: searchUrl };
  }

  try {
    const url =
      "https://www.googleapis.com/youtube/v3/search" +
      "?part=snippet&type=video&maxResults=1&safeSearch=strict" +
      "&relevanceLanguage=pt&regionCode=BR" +
      "&q=" +
      encodeURIComponent(query + " receita fitness") +
      "&key=" +
      key;
    const res = await fetch(url);
    if (!res.ok) throw new Error("yt " + res.status);
    const data = await res.json();
    const item = data.items?.[0];
    if (!item?.id?.videoId) {
      return { video_id: null, video_title: null, video_url: searchUrl };
    }
    return {
      video_id: item.id.videoId,
      video_title: item.snippet?.title || query,
      video_url: "https://www.youtube.com/watch?v=" + item.id.videoId,
    };
  } catch {
    return { video_id: null, video_title: null, video_url: searchUrl };
  }
}
