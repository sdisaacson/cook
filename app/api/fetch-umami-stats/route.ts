import { getClient } from '@umami/api-client';

export const dynamic = 'force-dynamic'; // defaults to auto

const client = getClient();

export async function GET(request: Request) {
  try {
    // The website ID
    const websiteId = '2ff5fb4d-88e4-48a1-98ef-04b8191a6a5c';

    // Get the current time and the Unix epoch time in milliseconds
    const now = Date.now();
    const oneDayInMilliseconds = 7 * 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const startAt = now - oneDayInMilliseconds; // 24 hours ago

    // Prepare the data object for getWebsiteMetrics
    const metricsData = {
      startAt: startAt,
      endAt: now,
      type: 'url' // Example type, change as needed
    };

    const { ok, data, status, error } = await client.getWebsiteStats(websiteId, metricsData);

    if (!ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch website metrics' }), { status: status });
    }

    return new Response(JSON.stringify(data), { status: 200 });
  } catch (error) {
    console.error('Error fetching website metrics:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch website metrics' }), { status: 500 });
  }
}
