// @ts-nocheck

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders, OPENROUTER_URL, appConfig } from './config.ts'
import type {
  RequestBody,
  OpenRouterRequest,
} from '../../../src/app/models/supabase edge functions/open-router-llm-response-models.ts'

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

const validateRequest = (body: unknown): RequestBody => {
  const data = body as RequestBody
  if (!data?.prompt?.trim() || !data?.model_id?.trim()) {
    throw new ApiError(400, 'Missing required parameters: prompt and model_id')
  }
  return data
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('OPENROUTER_API_KEY')
    if (!apiKey) {
      throw new ApiError(500, 'Missing OpenRouter API key configuration')
    }

    const requestBody = validateRequest(await req.json())
    const request: OpenRouterRequest = {
      model: requestBody.model_id,
      messages: [
        {
          role: 'system',
          content: `You are a helpful AI assistant and teacher. Generate a conversational response and educational flashcards based on the user's input.`,
        },
        ...(requestBody.chat_history || []),
        {
          role: 'user',
          content: requestBody.prompt,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'chat_response',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'Conversational response to the user',
              },
              cards: {
                type: 'array',
                description: 'Array of flashcards',
                items: {
                  type: 'object',
                  properties: {
                    front: {
                      type: 'string',
                      description: 'Question or prompt side of the flashcard',
                    },
                    back: {
                      type: 'string',
                      description:
                        'Answer or explanation side of the flashcard',
                    },
                  },
                  required: ['front', 'back'],
                  additionalProperties: false,
                },
              },
            },
            required: ['message', 'cards'],
            additionalProperties: false,
          },
        },
      },
    }

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': appConfig.website,
        'X-Title': appConfig.name,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new ApiError(
        response.status,
        error.error?.message || 'OpenRouter API error',
      )
    }

    const rawResponse = await response.json()
    // Parse the content string from the response
    const contentString = rawResponse.choices[0].message.content
    const parsedContent = JSON.parse(contentString)

    return new Response(JSON.stringify(parsedContent), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Error:', error)
    const status = error instanceof ApiError ? error.status : 500
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    })
  }
})
