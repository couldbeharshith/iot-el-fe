import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const NODES_FILE = path.join(DATA_DIR, 'nodeNames.json')

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
  } catch (err) {
    // Directory might already exist
  }
}

async function readNodes() {
  try {
    await ensureDataDir()
    const data = await fs.readFile(NODES_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return {}
  }
}

async function writeNodes(nodes: Record<string, string>) {
  try {
    await ensureDataDir()
    await fs.writeFile(NODES_FILE, JSON.stringify(nodes, null, 2))
  } catch (err) {
    console.error('Failed to write nodes:', err)
  }
}

// GET all node names
export async function GET() {
  try {
    const nodes = await readNodes()
    return NextResponse.json(nodes)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read nodes' }, { status: 500 })
  }
}

// PUT update node name
export async function PUT(request: NextRequest) {
  try {
    const { nodeId, name } = await request.json()
    const nodes = await readNodes()
    
    if (name && name.trim()) {
      nodes[nodeId] = name.trim()
    } else {
      delete nodes[nodeId]
    }
    
    await writeNodes(nodes)
    return NextResponse.json(nodes)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update node' }, { status: 500 })
  }
}
