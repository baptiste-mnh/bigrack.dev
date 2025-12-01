/*
 * Copyright 2025 BigRack.dev
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Button } from '@bigrack/shared';
import Link from 'next/link';
import Image from 'next/image';
import { ClipboardList, Brain, Plug, ArrowRight, Star } from 'lucide-react';
import { ScrollReveal } from '../components/ScrollReveal';
import { Navbar } from '../components/Navbar';
import { BigRackFlow } from '../components/BigRackFlow';
import { InstallationSteps } from '../components/InstallationSteps';

export default function Home() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />

      {/* Hero with Flow */}
      <section className="px-4 pt-20 pb-16 md:pt-32 md:pb-24">
        <div className="container mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-stretch">
            {/* Left: Hero Content */}
            <div className="flex flex-col">
              {/* Social proof badge */}
              <ScrollReveal direction="fade" delay={0}>
                <div className="flex items-center gap-2 mb-8">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-foreground text-foreground" />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Built for <span className="font-semibold text-foreground">developers</span> who
                    vibe code
                  </span>
                </div>
              </ScrollReveal>

              {/* Main headline */}
              <ScrollReveal direction="up" delay={100}>
                <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-tight tracking-tight text-foreground">
                  Kanban + Memory
                  <br />
                  <span className="text-primary">for AI Dev Tools</span>
                </h1>
              </ScrollReveal>

              {/* Divider line */}
              <ScrollReveal direction="fade" delay={200}>
                <div className="flex my-8">
                  <div className="w-32 h-1 bg-foreground rounded-full" />
                </div>
              </ScrollReveal>

              {/* Subtitle */}
              <ScrollReveal direction="up" delay={300}>
                <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
                  An MCP server that gives memory to your AI, structured tasks and vectorized
                  context.{' '}
                  <span className="font-semibold text-foreground">AI coding made consistent</span>{' '}
                  while saving hours per week.
                </p>
              </ScrollReveal>

              {/* CTA Buttons */}
              <ScrollReveal direction="up" delay={400}>
                <div className="flex flex-col sm:flex-row gap-4 mt-12">
                  <Link href="/docs">
                    <Button size="lg">Get Started</Button>
                  </Link>
                  <Link
                    href="https://github.com/baptiste-mnh/bigrack.dev"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="lg" variant="outline" className="w-full sm:w-auto group">
                      Explore Project
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                </div>
              </ScrollReveal>
            </div>

            {/* Right: BigRack Flow */}
            <div className="w-full">
              <ScrollReveal direction="up" delay={200}>
                <BigRackFlow />
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="relative py-20 overflow-visible">
        {/* Background image - positioned outside container, aligned with bottom border */}
        <div className="hidden md:block absolute -bottom-20 right-0 -mr-10 md:-mr-20 w-96 h-96 md:w-[600px] md:h-[600px] lg:w-[700px] lg:h-[700px] opacity-15 pointer-events-none z-0">
          <Image
            src="/images/women_bigrack_transparent.png"
            alt=""
            width={700}
            height={700}
            className="object-contain"
            style={{ objectPosition: 'right bottom' }}
            priority
          />
        </div>
        <div className="container mx-auto max-w-5xl px-4 relative z-10">
          <ScrollReveal direction="up" delay={0}>
            <h2 className="text-center font-serif text-3xl md:text-4xl text-foreground mb-4">
              Why developers love BigRack
            </h2>
            <p className="text-center text-muted-foreground mb-16 max-w-xl mx-auto">
              Everything your AI assistant needs to stay on track
            </p>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8 items-stretch relative z-10">
            {/* Kanban */}
            <ScrollReveal direction="up" delay={100} className="h-full">
              <div className="h-full bg-card rounded-xl p-8 shadow-sm border border-border/50 hover:shadow-md transition-shadow">
                <div className="mb-5 inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10">
                  <ClipboardList className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Smart Kanban</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Break down features into atomic tasks with dependencies. The Kanban knows what to
                  do next.
                </p>
              </div>
            </ScrollReveal>

            {/* Context */}
            <ScrollReveal direction="up" delay={200} className="h-full">
              <div className="h-full bg-card rounded-xl p-8 shadow-sm border border-border/50 hover:shadow-md transition-shadow">
                <div className="mb-5 inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10">
                  <Brain className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Vector Context</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Business rules, patterns, conventions. Local embeddings. AI remembers everything.
                </p>
              </div>
            </ScrollReveal>

            {/* MCP */}
            <ScrollReveal direction="up" delay={300} className="h-full">
              <div className="h-full bg-card rounded-xl p-8 shadow-sm border border-border/50 hover:shadow-md transition-shadow">
                <div className="mb-5 inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10">
                  <Plug className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">MCP Standard</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Native Claude protocol. Compatible with Claude Code, Cursor, and more.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Installation */}
      <section className="bg-muted/50 border-y border-border/50 py-20">
        <div className="container mx-auto max-w-3xl px-4">
          <ScrollReveal direction="up" delay={0}>
            <h2 className="text-center font-serif text-3xl md:text-4xl text-foreground mb-4">
              Get started in seconds
            </h2>
            <p className="text-center text-muted-foreground mb-12">
              Ready in 30 seconds. Open source (Apache 2.0).
            </p>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={100}>
            <InstallationSteps />
          </ScrollReveal>
        </div>
      </section>

      {/* Footer minimal */}
      <footer className="border-t border-border/50 py-12 bg-muted/30">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="BigRack logo"
                width={24}
                height={24}
                className="h-6 w-6 rounded-md"
              />
              <span className="text-muted-foreground text-sm">© 2025 BigRack.dev</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/docs" className="hover:text-foreground transition-colors">
                Docs
              </Link>
              <Link
                href="https://github.com/baptiste-mnh/bigrack.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                GitHub
              </Link>
              <Link
                href="https://github.com/baptiste-mnh/bigrack.dev/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                Issues
              </Link>
              <Link href="/licenses" className="hover:text-foreground transition-colors">
                Open source licenses
              </Link>
              <Link href="/legal" className="hover:text-foreground transition-colors">
                Legal
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
