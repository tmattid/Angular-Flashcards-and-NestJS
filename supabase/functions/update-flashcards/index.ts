// @ts-ignore

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { appConfig, corsHeaders, OPENROUTER_URL } from './config.ts'

interface GridRow {
  readonly setId: string
  readonly flashcardId: string
  readonly set_title: string
  front: string
  back: string
  readonly tags: string[] | null
  difficulty: number | null
  readonly created_at: string
  readonly position: number // Add position tracking
}

interface OpenRouterRequest {
  model: string
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  response_format: {
    type: 'json_schema'
    json_schema: {
      name: 'flashcard_updates'
      strict: true
      schema: {
        type: 'object'
        properties: {
          message: {
            type: 'string'
            description: 'Explanation of the changes made'
          }
          updates: {
            type: 'array'
            description: 'Array of flashcard updates'
            items: {
              type: 'object'
              properties: {
                flashcardId: {
                  type: 'string'
                  description: 'ID of the flashcard to update'
                }
                changes: {
                  type: 'object'
                  properties: {
                    front: { type: 'string' }
                    back: { type: 'string' }
                    difficulty: { type: 'number' }
                  }
                  required: ['front', 'back', 'difficulty']
                  additionalProperties: false
                }
              }
              required: ['flashcardId', 'changes']
              additionalProperties: false
            }
          }
        }
        required: ['message', 'updates']
        additionalProperties: false
      }
    }
  }
}

interface GridAiResponse {
  message: string
  updates?: Array<{
    flashcardId: string
    changes: Partial<Pick<GridRow, 'front' | 'back' | 'difficulty'>>
  }>
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('OPENROUTER_API_KEY')
    if (!apiKey) {
      throw new Error('Missing OpenRouter API key')
    }

    const { prompt, model_id, context } = await req.json()

    console.log('Request payload:', { prompt, model_id, context })

    const request: OpenRouterRequest = {
      model: model_id,
      messages: [
        {
          role: 'system',
          content: `You are a helpful AI assistant focused on improving flashcards.
          You will receive a set of flashcards to modify based on the user's request.
          ${
            context.selectedCards.length > 0
              ? `IMPORTANT: Focus only on the ${context.selectedCards.length} selected flashcards.`
              : 'You may modify any cards in the set.'
          }

          You MUST respond with a JSON object containing:
          1. A "message" field explaining your changes (string)
          2. An "updates" array containing modified cards, each with:
             - flashcardId: string
             - changes: { front?: string, back?: string, difficulty?: number }

          Keep educational value and clarity in mind.`,
        },
        {
          role: 'user',
          content: JSON.stringify({
            prompt,
            flashcards: context.selectedCards,
            set_info: {
              title: context.setTitle,
              total_cards: context.totalCards,
            },
          }),
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'flashcard_updates',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'Explanation of the changes made',
              },
              updates: {
                type: 'array',
                description: 'Array of flashcard updates',
                items: {
                  type: 'object',
                  properties: {
                    flashcardId: {
                      type: 'string',
                      description: 'ID of the flashcard to update',
                    },
                    changes: {
                      type: 'object',
                      properties: {
                        front: { type: 'string' },
                        back: { type: 'string' },
                        difficulty: { type: 'number' },
                      },
                      required: ['front', 'back', 'difficulty'],
                      additionalProperties: false,
                    },
                  },
                  required: ['flashcardId', 'changes'],
                  additionalProperties: false,
                },
              },
            },
            required: ['message', 'updates'],
            additionalProperties: false,
          },
        },
      },
    }

    console.log('OpenRouter request:', JSON.stringify(request, null, 2))

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
      const errorData = await response.json()
      console.error('OpenRouter error response:', errorData)
      throw new Error(`OpenRouter API error: ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()
    console.log('Raw OpenRouter response:', JSON.stringify(data, null, 2))

    // Validate response structure
    if (!data?.choices?.[0]?.message?.content) {
      console.error('Invalid response structure:', data)
      throw new Error(`Invalid response structure: ${JSON.stringify(data)}`)
    }

    let parsedContent: GridAiResponse
    try {
      const contentString = data.choices[0].message.content
      console.log('Content string before parsing:', contentString)

      // Attempt to parse and validate the content
      parsedContent = JSON.parse(contentString)
      console.log('Parsed content:', JSON.stringify(parsedContent, null, 2))

      // Validate required fields
      if (typeof parsedContent.message !== 'string') {
        throw new Error(
          `Invalid message field: ${JSON.stringify(parsedContent.message)}`,
        )
      }

      if (!Array.isArray(parsedContent.updates)) {
        throw new Error(
          `Invalid updates field: ${JSON.stringify(parsedContent.updates)}`,
        )
      }

      // Validate each update
      parsedContent.updates.forEach((update, index) => {
        if (!update.flashcardId || !update.changes) {
          throw new Error(
            `Invalid update at index ${index}: ${JSON.stringify(update)}`,
          )
        }
      })
    } catch (e) {
      console.error('Parsing error details:', e)
      throw new Error(`Failed to parse AI response: ${e.message}`)
    }

    return new Response(JSON.stringify(parsedContent), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Edge Function Error:', error)
    return new Response(
      JSON.stringify({
        error: (error as Error).message || 'An unexpected error occurred',
        details: error.stack,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
