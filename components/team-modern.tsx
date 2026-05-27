'use client'
import React, { useRef } from 'react'
import { Codesandbox } from 'lucide-react'
import { TimelineAnimation } from '@/components/timeline-animation'

const TEAM_MEMBERS_1 = [
  {
    id: '1',
    name: 'Shabbir Ezzy',
    role: 'Lead Developer',
    image:
      'https://supabase.placetrix.app/storage/v1/object/public/landing-page-material/team-members/Shabbir.png',
  },
  {
    id: '2',
    name: 'Sidra Chaudhari',
    role: 'UI-UX Developer',
    image:
      'https://supabase.placetrix.app/storage/v1/object/public/landing-page-material/team-members/Sidra.png',
  },
  {
    id: '3',
    name: 'Pushkar Gaikwad',
    role: 'Software Engineer',
    image:
      'https://supabase.placetrix.app/storage/v1/object/public/landing-page-material/team-members/Pushkar.png',
  },
  {
    id: '4',
    name: 'Vishal Raut',
    role: 'LogicLab Developer',
    image:
      'https://supabase.placetrix.app/storage/v1/object/public/landing-page-material/team-members/Vishal.png',
  },
]

export const TeamModern = () => {
  const timelineRef = useRef<HTMLDivElement>(null)

  return (
    <section className="bg-white" ref={timelineRef}>
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="mb-8">
          <TimelineAnimation
            timelineRef={timelineRef}
            animationNum={1}
            as="span"
            className="inline-block px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full mb-4"
          >
            4GridTech Presents
          </TimelineAnimation>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <TimelineAnimation
                timelineRef={timelineRef}
                animationNum={1}
                as="h2"
                className="text-5xl font-spaceGrotesk font-bold text-neutral-900 mb-6"
              >
                 The Team {/*Behind PlaceTrix */}
              </TimelineAnimation>
              <TimelineAnimation
                timelineRef={timelineRef}
                animationNum={2}
                as="p"
                className="text-lg text-neutral-500 leading-relaxed"
              >
                Unleashing creativity, our team of design visionaries turns
                ordinary spaces into extraordinary experiences.
              </TimelineAnimation>
            </div>
            <TimelineAnimation
              timelineRef={timelineRef}
              animationNum={8}
              className="flex items-center gap-4"
            >
              <button className="font-spaceGrotesk px-3 py-2.5 bg-black shadow-lg shadow-black text-white font-semibold rounded-lg hover:bg-neutral-900 transition-colors">
                Join Us
              </button>
              <button className="font-spaceGrotesk bg-neutral-100 px-3 py-2.5 border border-neutral-300 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-50 transition-colors">
                Explore Projects
              </button>
            </TimelineAnimation>
          </div>
        </div>

        {/* <TimelineAnimation
          timelineRef={timelineRef}
          animationNum={5}
          className="flex flex-wrap gap-8 py-12 mb-12 border-b border-neutral-100"
        >
          <div className="flex items-center gap-2 text-neutral-900 font-semibold text-xl">
            <Codesandbox color="#7C3AED" size={32} /> UI-Layouts
          </div>
          <div className="flex items-center gap-2 text-neutral-900 font-semibold text-xl">
            <Codesandbox color="#4F46E5" size={32} /> Tools UI
          </div>
          <div className="flex items-center gap-2 text-neutral-900 font-semibold text-xl">
            <Codesandbox color="#DC2626" size={32} /> Logoipsum
          </div>
          <div className="flex items-center gap-2 text-neutral-900 font-semibold text-xl">
            <Codesandbox color="#F59E0B" size={32} /> Logoipsum
          </div>
        </TimelineAnimation> */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {TEAM_MEMBERS_1.map((member, i) => (
            <TimelineAnimation
              key={member.id}
              timelineRef={timelineRef}
              animationNum={3 + i}
              className="group"
            >
              <div className="relative overflow-hidden rounded-2xl mb-4 bg-neutral-100 aspect-4/5">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <h3 className="text-xl font-spaceGrotesk font-semibold text-neutral-900 mb-1">
                {member.name}
              </h3>
              <p className="text-neutral-500">{member.role}</p>
            </TimelineAnimation>
          ))}
        </div>
      </div>
    </section>
  )
}
