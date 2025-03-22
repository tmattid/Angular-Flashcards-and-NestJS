import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Extracts a block of code starting with the given label by counting braces.
 * Returns the block including the outer braces, or undefined if not found.
 */
function extractBlock(content: string, label: string): string | undefined {
  const labelIndex = content.indexOf(label + ':')
  if (labelIndex === -1) return undefined

  // Find the first '{' after the label
  const openBraceIndex = content.indexOf('{', labelIndex)
  if (openBraceIndex === -1) return undefined

  let depth = 0
  let endIndex = openBraceIndex
  for (; endIndex < content.length; endIndex++) {
    if (content[endIndex] === '{') {
      depth++
    } else if (content[endIndex] === '}') {
      depth--
      if (depth === 0) {
        break
      }
    }
  }
  return content.substring(openBraceIndex, endIndex + 1)
}

/**
 * Fixes a row definition by preserving each line as a property.
 */
function fixRowDefinition(row: string): string {
  let fixed = row.trim()
  if (!fixed.startsWith('{')) fixed = `{ ${fixed}`
  if (!fixed.endsWith('}')) fixed = `${fixed} }`

  // Split the content into lines, trim each line, and filter out empty lines
  const lines = fixed
    .slice(1, -1) // Remove outer braces
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line)

  // Indent each line and join them back with newlines
  const indentedLines = lines.map((line) => `  ${line}`)
  return `{\n${indentedLines.join('\n')}\n}`
}

// Get the current file's directory
const currentPath = fileURLToPath(new URL('.', import.meta.url))
const modelsPath = resolve(currentPath, 'supabase.models.ts')
const outputPath = resolve(currentPath, 'simplified.types.ts')

try {
  if (!existsSync(modelsPath)) {
    throw new Error(`Supabase models file not found at ${modelsPath}.`)
  }

  const content = readFileSync(modelsPath, 'utf-8')

  // Extract the public block from the Database type
  const publicBlock = extractBlock(content, 'public')
  if (!publicBlock) {
    throw new Error(
      `Could not extract the "public" block from the Database type.`,
    )
  }

  // Extract the Tables block from the public block
  const tablesBlock = extractBlock(publicBlock, 'Tables')
  if (!tablesBlock) {
    throw new Error(
      `Could not extract the Tables block from the public section.`,
    )
  }

  // Extract each table's "Row" definition using regex on the tablesBlock
  // Adjusted regex to capture table name and Row definition more accurately
  const tableRegex = /(\w+):\s*{\s*Row:\s*({[\s\S]*?})\s*(?:Insert|Update|Relationships)/g
  const tables: Record<string, string> = {}
  let match: RegExpExecArray | null
  while ((match = tableRegex.exec(tablesBlock)) !== null) {
    const tableName = match[1]
    const rowDefinition = match[2] // Directly use the extracted Row definition
    tables[tableName] = fixRowDefinition(rowDefinition) // Apply simplified fix
  }

  // Extract the Enums block from the public block
  const enumsBlock = extractBlock(publicBlock, 'Enums')
  const enums: Record<string, string> = {}
  if (enumsBlock) {
    // Match enums defined as: enumName: "value1" | "value2" | "value3"
    const enumRegex = /(\w+):\s*((?:"[^"]+"\s*(?:\|\s*)?)+)/g
    while ((match = enumRegex.exec(enumsBlock)) !== null) {
      const enumKey = match[1]
      const enumValues = match[2].replace(/\s+/g, ' ').trim()
      enums[enumKey] = enumValues
    }
  }

  // Generate the simplified types content - Flat interfaces and type aliases
  let simplifiedContent = ''

  // Generate interfaces for tables
  simplifiedContent += '// Tables\n'
  for (const [key, def] of Object.entries(tables)) {
    simplifiedContent += `export interface ${capitalize(key)} ${def}\n`
  }

  // Generate type aliases for enums
  simplifiedContent += '\n// Enums\n'
  for (const [key, def] of Object.entries(enums)) {
    simplifiedContent += `export type ${capitalize(key)} = ${def};\n`
  }

  writeFileSync(outputPath, simplifiedContent)
  console.log(`Simplified types generated at ${outputPath}`)
} catch (error) {
  console.error('Error processing types:', error)
  process.exit(1)
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
