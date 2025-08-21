import { useRef, useState, useEffect } from 'react'

export default function App() {
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [brush, setBrush] = useState(20)
  const canvasRef = useRef(null)
  const maskRef = useRef(null)
  const drawing = useRef(false)
  const last = useRef({ x: 0, y: 0 })
  const imgEl = useRef(null)

  useEffect(() => {
    if (!file) return
    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      const mask = maskRef.current
      canvas.width = img.width
      canvas.height = img.height
      mask.width = img.width
      mask.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      const mctx = mask.getContext('2d')
      mctx.fillStyle = 'black'
      mctx.fillRect(0, 0, mask.width, mask.height)
      imgEl.current = img
    }
    img.src = URL.createObjectURL(file)
  }, [file])

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const start = (e) => {
    if (!file) return
    drawing.current = true
    const { x, y } = getPos(e)
    last.current = { x, y }
  }

  const draw = (e) => {
    if (!drawing.current) return
    const { x, y } = getPos(e)
    const ctx = canvasRef.current.getContext('2d')
    const mctx = maskRef.current.getContext('2d')
    ctx.strokeStyle = 'red'
    ctx.lineWidth = brush
    ctx.lineCap = 'round'
    mctx.strokeStyle = 'white'
    mctx.lineWidth = brush
    mctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(x, y)
    ctx.stroke()
    mctx.beginPath()
    mctx.moveTo(last.current.x, last.current.y)
    mctx.lineTo(x, y)
    mctx.stroke()
    last.current = { x, y }
  }

  const end = () => {
    drawing.current = false
  }

  const clear = () => {
    if (!file) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(imgEl.current, 0, 0)
    const mctx = maskRef.current.getContext('2d')
    mctx.fillStyle = 'black'
    mctx.fillRect(0, 0, maskRef.current.width, maskRef.current.height)
    setResult(null)
  }

  const remove = async () => {
    if (!file) return
    const maskBlob = await new Promise((resolve) => maskRef.current.toBlob(resolve, 'image/png'))
    const form = new FormData()
    form.append('image', file)
    form.append('mask', maskBlob, 'mask.png')
    const res = await fetch('/api/inpaint', { method: 'POST', body: form })
    const blob = await res.blob()
    setResult(URL.createObjectURL(blob))
  }

  return (
    <div>
      <h1>Watermark Remover</h1>
      <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
      {file && (
        <div>
          <canvas
            ref={canvasRef}
            onMouseDown={start}
            onMouseMove={draw}
            onMouseUp={end}
            onMouseLeave={end}
            style={{ border: '1px solid #ccc', cursor: 'crosshair' }}
          />
          <canvas ref={maskRef} style={{ display: 'none' }} />
          <div>
            <label>
              Brush: <input type="range" min="1" max="100" value={brush} onChange={(e) => setBrush(+e.target.value)} />
            </label>
            <button onClick={clear}>Clear</button>
            <button onClick={remove}>Remove</button>
            {result && (
              <a href={result} download="result.png">Download result</a>
            )}
          </div>
          {result && <img src={result} alt="result" style={{ maxWidth: '100%' }} />}
        </div>
      )}
    </div>
  )
}
