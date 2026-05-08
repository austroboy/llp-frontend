'use client'

import { useEffect, useRef, useCallback } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
}

interface ParticlesBackgroundProps {
  className?: string
  particleColor?: string
  lineColor?: string
  particleCount?: number
}

export function ParticlesBackground({
  className = '',
  particleColor = '#b94a4a',
  lineColor = '#b94a4a',
  particleCount = 60,
}: ParticlesBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationRef = useRef<number | null>(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const isInitializedRef = useRef(false)

  const initParticles = useCallback(
    (width: number, height: number) => {
      particlesRef.current = []
      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8,
          size: Math.random() * 2 + 1,
        })
      }
    },
    [particleCount]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      const parent = canvas.parentElement
      if (!parent) return

      const rect = parent.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = rect.width
        canvas.height = rect.height

        if (!isInitializedRef.current || particlesRef.current.length === 0) {
          initParticles(rect.width, rect.height)
          isInitializedRef.current = true
        }
      }
    }

    const drawParticle = (particle: Particle) => {
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
      ctx.fillStyle = particleColor
      ctx.globalAlpha = 0.6
      ctx.fill()
      ctx.globalAlpha = 1
    }

    const drawConnections = () => {
      const particles = particlesRef.current
      const maxDistance = 120

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < maxDistance) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = lineColor
            ctx.globalAlpha = (1 - distance / maxDistance) * 0.3
            ctx.lineWidth = 0.5
            ctx.stroke()
            ctx.globalAlpha = 1
          }
        }

        const dx = particles[i].x - mouseRef.current.x
        const dy = particles[i].y - mouseRef.current.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < 150 && mouseRef.current.x > 0) {
          ctx.beginPath()
          ctx.moveTo(particles[i].x, particles[i].y)
          ctx.lineTo(mouseRef.current.x, mouseRef.current.y)
          ctx.strokeStyle = lineColor
          ctx.globalAlpha = (1 - distance / 150) * 0.5
          ctx.lineWidth = 0.8
          ctx.stroke()
          ctx.globalAlpha = 1
        }
      }
    }

    const updateParticles = () => {
      const particles = particlesRef.current
      const width = canvas.width
      const height = canvas.height

      particles.forEach((particle) => {
        particle.x += particle.vx
        particle.y += particle.vy

        if (particle.x < 0 || particle.x > width) particle.vx *= -1
        if (particle.y < 0 || particle.y > height) particle.vy *= -1

        particle.x = Math.max(0, Math.min(width, particle.x))
        particle.y = Math.max(0, Math.min(height, particle.y))

        const dx = particle.x - mouseRef.current.x
        const dy = particle.y - mouseRef.current.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < 100 && distance > 0) {
          const force = (100 - distance) / 100
          particle.vx += (dx / distance) * force * 0.2
          particle.vy += (dy / distance) * force * 0.2
        }

        const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy)
        if (speed > 2) {
          particle.vx = (particle.vx / speed) * 2
          particle.vy = (particle.vy / speed) * 2
        }
      })
    }

    const animate = () => {
      if (canvas.width === 0 || canvas.height === 0) {
        resizeCanvas()
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (particlesRef.current.length > 0) {
        updateParticles()
        drawConnections()
        particlesRef.current.forEach(drawParticle)
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    }

    const handleMouseLeave = () => {
      mouseRef.current = { x: 0, y: 0 }
    }

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas()
    })

    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement)
    }

    const initTimer = setTimeout(() => {
      resizeCanvas()
      animate()
    }, 100)

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      clearTimeout(initTimer)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      resizeObserver.disconnect()
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [particleColor, lineColor, initParticles])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 h-full w-full pointer-events-auto ${className}`}
      style={{ zIndex: 1 }}
    />
  )
}
