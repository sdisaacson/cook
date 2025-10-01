import { getClient } from '@umami/api-client';

export const dynamic = 'force-dynamic'; // defaults to auto

const client = getClient();

export async function GET(request: Request) {
  try {
    // The website ID
    const websiteId = '2ff5fb4d-88e4-48a1-98ef-04b8191a6a5c';

    // Get the current time and one year ago in milliseconds
    const now = Date.now();
    const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000; // 1 year ago

    // Prepare the data object for getWebsitePageviews
    const pageviewsData = {
      startAt: oneYearAgo,
      endAt: now,
      unit: 'day', // Change to 'day' for daily data over the year
      timezone: 'America/Los_Angeles',
      region: 'US',
    };

    console.log('Fetching pageviews with data:', pageviewsData);

    const response = await client.getWebsitePageviews(websiteId, pageviewsData);
    const { ok, data, status, error } = response; // Adjusted to destructure from response

    if (!ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch website pageviews' }), { status: status });
    }

    console.log('Pageviews data:', data);

    return new Response(JSON.stringify(data), { status: 200 });
  } catch (error) {
    console.error('Error fetching website pageviews:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch website pageviews' }), { status: 500 });
  }
}