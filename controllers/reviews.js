const OPENAI_API_KEY = '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';
require('dotenv').config();
const categories = [
  'ambience',
  'wifi',
  'parking',
  'restaurants',
  'security',
  'power backup',
  'hygiene',
  'air-conditioning',
];
const { Configuration, OpenAIApi } = require('openai');
// const behaviourPrompt = `Given a collection of highlighted sections from hotel reviews, categorize these highlights into different categories based on their content, such as room quality, service, cleanliness, amenities, pricing, and overall experience. Your task is to thoroughly analyze these highlights and organize them into these distinct categories. Summarize the key points or sentiments mentioned in each category based on the provided highlights. Generate a JSON output where each category is a key, and its corresponding value is a summarized result capturing the essence of the highlights within that category. Use natural language processing techniques or relevant methods to categorize and summarize the highlights effectively. Ensure that the output includes comprehensive information for each category without any truncation. `;
const behaviourPrompt = `Given a series of hotel reviews, categorize these reviews into specific categories: ${categories.join(
  ', '
)}.
 Your task is to analyze each review and assign them to the respective categories based on the content discussing these specific aspects of the hotel.
 Summarize each review into less than 100 words for each category and provide a score out of 100 for each category, reflecting the overall sentiment or experience mentioned in the reviews.
 Additionally, calculate an overall score considering all the individual category scores.
Generate a JSON output structured as follows:
{
    "categories": {
        "ambience": {
            "review": "summary of the review",
            "score": "score for the category in number out of 100"
        },
        "wifi": {
            "review": "summary of the review",
            "score": "score for the category in number out of 100"
        },
        // Other categories follow a similar structure
    },
    "overallScore": "overall score in number out of 100",
    "pros": "What good things can be highlighted",
    "cons": "What areas should be approached with caution"
}
Ensure that the summary for each category remains concise within 100 words, and the scores are reflective of the sentiment or experience conveyed in the reviews.
If a category doesn't have any reviews, represent the review as empty string.
The overall score should be calculated based on these individual category scores. Highlight the pros and cons of the hotel based on the reviews gathered and it should not exceed 250 words.`;
exports.getReviews = async (req, res) => {
  const hotel_id = req?.query?.hotel_id;
  const requestUrl = `https://www.oyorooms.com/api/pwa/updateHotelCall?url=https://bff.oyorooms.com/v1/hotels/reviews?hotel_id=${hotel_id}`;

  const rawReviews = await fetch(requestUrl);
  const reader = rawReviews.body.getReader();
  let textResponse = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    textResponse += new TextDecoder().decode(value);
  }
  const response = JSON.parse(textResponse);
  const reviews =
    response?.data?.reviews?.map((review) => review.review_text) || [];
  const filteredReviews = reviews.filter(
    (review) => review && review.length > 20
  );
  console.log('filteredReviews ===>', filteredReviews);
  const gptRes = await generateResponse(filteredReviews);
  const sanitizedRes = sanitizeStringToObject(gptRes);
  console.log('gptRes ==========> ', sanitizedRes);
  return res.status(200).json(sanitizedRes);
};

function sanitizeStringToObject(str) {
  // Replace escaped newlines with actual newlines
  str = str.replace(/\\n/g, '\n');

  // Replace escaped characters like "&amp;" with their respective characters
  str = str.replace(/&amp;/g, '&');

  // Replace double backslashes with single backslashes
  str = str.replace(/\\\\/g, '\\');

  // Parse the sanitized string to a JSON object
  try {
    const jsonObject = JSON.parse(str);
    return jsonObject;
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return null;
  }
}

async function generateResponse(prompt) {
  const categoryPrompt = `${behaviourPrompt}. Perform the analysis on these reviews: "${prompt.join(
    ', '
  )}"`;
  try {
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);
    console.log('categoryPrompt ===> ', categoryPrompt);
    const response = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: categoryPrompt,
      temperature: 0.1,
      max_tokens: 3000,
    });
    console.log(response?.data);
    return response?.data?.choices[0].text.trim() || null;
  } catch (err) {
    return 'Error in gpt while parsing the content';
  }
}
