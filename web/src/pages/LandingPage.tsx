import {
  ArrowRight,
  Check,
  Heart,
  ListMusic,
  Mic2,
  Monitor,
  Music2,
  Play,
  Plus,
  QrCode,
  Search,
  Smartphone,
  Users,
  Volume2,
} from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { BuyMeCoffeeLink } from '@/components/support/BuyMeCoffeeLink'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const container =
  'mx-auto w-[calc(100%-40px)] max-w-7xl md:w-[calc(100%-64px)] min-[1200px]:w-[calc(100%-96px)]'
const eyebrow =
  'text-[9px] font-bold leading-relaxed tracking-[2px] text-landing-accent md:text-[11px] md:tracking-[2.7px]'
const sectionHeading =
  'text-[27px] font-[650] leading-tight tracking-[-0.9px] md:text-[34px] md:tracking-[-1.3px]'
const actionButton =
  'h-13 gap-2.5 rounded-lg px-[15px] text-[13px] motion-safe:hover:-translate-y-0.5 min-[421px]:w-auto md:px-5 md:text-sm lg:max-[1200px]:px-3.5 lg:max-[1200px]:text-xs'

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/"
      className={cn(
        'inline-flex items-center font-[750] tracking-tight',
        compact ? 'gap-2 text-base' : 'gap-2 text-xl md:gap-3 md:text-[22px]',
      )}
      aria-label="Barkadaoke home"
    >
      <Mic2
        aria-hidden="true"
        className={cn(
          '-rotate-12 stroke-[1.7] text-landing-accent',
          compact ? 'h-6.5 w-[23px]' : 'h-7.5 w-6.5 md:h-9 md:w-8',
        )}
      />
      <span>Barkadaoke</span>
    </Link>
  )
}

function LandingActions({ centered = false }: { centered?: boolean }) {
  return (
    <div
      className={cn(
        'mt-6 flex flex-col gap-2.5 min-[421px]:flex-row min-[421px]:flex-wrap md:mt-[29px] md:gap-3',
        centered && 'justify-center',
      )}
    >
      <GoogleSignInButton
        className={cn(
          actionButton,
          'bg-landing-accent text-[#041710] shadow-[0_5px_30px_#00d6a010] hover:bg-[#20ebbc] [&_svg]:size-5',
        )}
      />
      <Button
        variant="outline"
        size="lg"
        className={cn(
          actionButton,
          'border-white/22 bg-white/1 text-[#eff5f4] hover:border-landing-accent hover:bg-white/4',
        )}
        asChild
      >
        <Link to="/join">
          <QrCode aria-hidden="true" />
          Enter room code
        </Link>
      </Button>
    </div>
  )
}

function SongArtwork({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'grid h-[31px] w-7 shrink-0 place-items-center rounded bg-linear-to-br [&_svg]:size-[13px] [&_svg]:text-white/60',
        className,
      )}
    >
      <Music2 aria-hidden="true" />
    </span>
  )
}

function RoomJoinPreview() {
  return (
    <aside className="flex flex-col items-center bg-linear-[150deg,#0c101c,#070a12] px-[7px] pt-3 pb-[7px] text-center md:px-3 md:pt-5 md:pb-3">
      <div className="flex items-center gap-[3px] text-[6px] md:gap-[5px] md:text-[9px]">
        <Mic2 className="size-[11px] text-landing-accent md:size-3.5" />
        Barkadaoke
      </div>
      <div className="relative mt-2.5 mb-[7px] text-landing-accent md:mt-5 md:mb-3">
        <Smartphone className="size-[29px] stroke-1 md:size-10.5" />
        <span className="absolute -right-[5px] bottom-0 rounded-full bg-landing-accent p-[3px] text-[#071510]">
          <Plus className="size-3" />
        </span>
      </div>
      <strong className="text-[7px] md:text-[9px]">
        The mic is for everyone.
      </strong>
      <p className="mt-1 text-[6px] text-[#97a4b5] md:text-[8px]">
        Join from your phone
      </p>
      <div className="mt-2 w-full rounded-[7px] border border-white/2 bg-[#151c2b] p-[5px] md:mt-3 md:px-3.5 md:py-[7px]">
        <span className="block text-[5px] text-[#a5b1c1] md:text-[7px]">
          Example room code
        </span>
        <b className="text-xs tracking-[2px] md:text-base md:tracking-[3px]">
          K8P4DZ
        </b>
      </div>
      <div className="mt-auto w-full border-t border-white/5 pt-[5px] text-left md:pt-3">
        <span className="text-[5px] tracking-wider text-[#939faf] md:text-[6px]">
          NOW PLAYING
        </span>
        <div className="mt-[5px] flex items-center gap-1.5">
          <SongArtwork className="h-5.5 w-5 from-[#cc7786] to-[#562853] md:h-[31px] md:w-7" />
          <p>
            <b className="text-[5px] md:text-[7px]">I Wanna Dance</b>
            <small className="mt-[3px] block text-[5px] text-[#a4aebc] md:text-[6px]">
              Whitney Houston
            </small>
          </p>
        </div>
      </div>
    </aside>
  )
}

function KaraokeTVPreview() {
  return (
    <div className="absolute top-[55px] left-0 w-full [transform:perspective(1000px)_rotateY(-8deg)_rotateZ(-1deg)] md:top-[77px] md:left-[4%] md:w-[94%]">
      <div className="grid h-54 grid-cols-[67%_33%] overflow-hidden rounded-lg border-4 border-b-[7px] border-[#191f23] bg-[#070b15] shadow-[0_0_0_2px_#030608,0_25px_70px_#0009] outline outline-[#49545a] md:h-75.5 md:grid-cols-[68%_32%] md:border-6 md:border-b-10">
        <div className="relative flex flex-col overflow-hidden px-[13px] pt-3 pb-2.5 [background:radial-gradient(ellipse_at_85%_70%,#50116c88,transparent_65%),linear-gradient(150deg,#020612,#101d49_60%,#090e26)] md:px-5 md:pt-4.5 md:pb-3">
          <div className="relative z-1 flex items-center justify-between">
            <span className="flex items-center gap-1 text-[10px] font-[750]">
              <span className="rounded bg-[#ff183c] px-[5px] py-[3px]">
                <Play className="size-2" fill="currentColor" />
              </span>
              YouTube
            </span>
            <span className="hidden rounded-full border border-white/12 px-[7px] py-1 text-[6px] tracking-wider text-[#b5b8d0] md:inline">
              KARAOKE NIGHT
            </span>
          </div>
          <div className="absolute inset-0 opacity-25 [background:repeating-conic-gradient(from_175deg_at_50%_-10%,transparent_0deg_13deg,#46aaa455_14deg_20deg,transparent_21deg_35deg)] [mask-image:linear-gradient(#000,transparent_90%)]" />
          <div className="z-1 flex flex-1 flex-col items-center justify-center text-center text-base leading-[1.4] font-[750] tracking-[-0.7px] min-[421px]:text-lg md:text-[23px] lg:max-[1200px]:text-xl">
            <span>I wanna dance</span>
            <span>with somebody</span>
            <strong className="text-[#00efba]">With somebody</strong>
            <strong className="text-[#00efba]">who loves me</strong>
          </div>
          <div>
            <div className="h-[3px] rounded-[3px] bg-[#484c7b77]">
              <span className="block h-full w-[42%] rounded-[3px] bg-linear-to-r from-landing-accent to-[#72ffe0]" />
            </div>
            <div className="mt-[9px] flex justify-between text-[7px] text-[#b7c1d3]">
              <span className="flex items-center gap-1.5">
                <Play className="size-2.5" fill="currentColor" />
                1:42 / 4:51
              </span>
              <Volume2 className="size-2.5" />
            </div>
          </div>
        </div>
        <RoomJoinPreview />
      </div>
      <div className="mx-auto h-5.5 w-1/4 bg-linear-to-r from-[#111a1f] via-[#343e42] to-[#12191b] [clip-path:polygon(30%_0,70%_0,75%_80%,100%_95%,100%_100%,0_100%,0_95%,25%_80%)]" />
    </div>
  )
}

const previewSongs = [
  {
    title: 'Dancing Queen',
    artist: 'ABBA',
    color: 'from-[#ce9f46] to-[#783523]',
  },
  {
    title: 'Perfect',
    artist: 'Ed Sheeran',
    color: 'from-[#448ba1] to-[#1f3c58]',
  },
  {
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    color: 'from-[#ad5192] to-[#3f286d]',
  },
  {
    title: 'Flowers',
    artist: 'Miley Cyrus',
    color: 'from-[#cc7786] to-[#562853]',
  },
]

function MobileQueuePreview() {
  return (
    <div className="absolute -bottom-px left-[4%] z-3 w-[191px] origin-bottom-left rounded-[27px] border-3 border-[#363c40] bg-[#090d11] p-2.5 pb-[11px] shadow-[12px_18px_35px_#000a,inset_0_0_0_2px_#000] outline outline-[#aa95806b] [transform:rotate(-9deg)_scale(0.58)] md:-bottom-2 md:left-[8%] md:[transform:rotate(-9deg)_scale(0.82)]">
      <div className="absolute top-[7px] left-1/2 h-3 w-15 -translate-x-1/2 rounded-[10px] bg-[#010203]" />
      <div className="mx-[5px] mt-0.5 mb-3.5 flex justify-between text-[6px]">
        <span>9:41</span>
        <span>● ▰</span>
      </div>
      <div className="flex items-center gap-1 pb-3 text-[8px]">
        <Mic2 className="size-3 text-landing-accent" />
        <b>Barkadaoke</b>
        <span className="ml-auto rounded-full bg-landing-accent/8 px-[5px] py-[3px] text-[6px] text-landing-accent">
          K8P4DZ
        </span>
      </div>
      <div className="flex items-center gap-[5px] rounded-md border border-white/12 p-[7px] text-[7px] text-[#a1acb4]">
        <Search className="size-2.5" />
        <span>Find your next song</span>
      </div>
      <div className="mt-[15px]">
        <b className="block text-[10px] tracking-[-0.2px]">
          Your next big moment
        </b>
        <span className="mt-[9px] block text-[5px] tracking-wider text-[#84919a]">
          SONGS
        </span>
      </div>
      <div>
        {previewSongs.map((song) => (
          <div
            className="flex items-center gap-1.5 border-b border-white/4 py-[7px]"
            key={song.title}
          >
            <SongArtwork className={song.color} />
            <div>
              <b className="block text-[7px]">{song.title}</b>
              <small className="mt-[3px] block text-[6px] text-[#9da7b1]">
                {song.artist}
              </small>
            </div>
            <Plus className="ml-auto size-3 rounded-full border border-[#5a6668] p-px text-[#c2cecf]" />
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-1.5 rounded-md border border-landing-accent/15 bg-landing-accent/7 px-1.5 py-2">
        <ListMusic className="size-3.5 text-landing-accent" />
        <div>
          <b className="block text-[6px] text-[#b4e6d8]">
            You're in good company
          </b>
          <small className="mt-[3px] block text-[5px] text-[#98aca7]">
            4 songs in the shared queue
          </small>
        </div>
      </div>
      <div className="mx-auto mt-[13px] h-[3px] w-[55px] rounded-[3px] bg-[#d8dce1]" />
    </div>
  )
}

function ProductShowcase() {
  return (
    <figure
      className="relative isolate mx-auto mt-1.5 h-90 w-full min-w-0 md:mt-0 md:h-[510px] md:w-[620px] md:max-w-full lg:mr-[-20px] lg:ml-0 lg:w-full"
      aria-label="Illustrative karaoke room: lyrics on a TV, a sample room code, and a phone with songs to queue."
    >
      <div className="absolute -top-25 -right-30 -bottom-7.5 -left-15 -z-2 [background:radial-gradient(ellipse_at_60%_40%,#00c99c22,transparent_55%),radial-gradient(ellipse_at_95%_60%,#c1851f22,transparent_45%)]" />
      <Mic2
        className="absolute top-0 left-[26%] h-10.5 w-[31px] -rotate-18 stroke-[1.2] text-[#55ffcf] opacity-80 drop-shadow-[0_0_8px_#00d6a0] md:top-0.5 md:h-16.5 md:w-13.5"
        aria-hidden="true"
      />
      <Music2
        className="absolute top-[13px] right-3 h-[31px] w-[25px] rotate-15 text-[#60ffd4] opacity-65 drop-shadow-[0_0_8px_#00d6a0] md:top-17 md:-right-2 md:h-12.5 md:w-10"
        aria-hidden="true"
      />
      <div className="absolute top-67 -right-[10%] left-0 h-[13px] bg-linear-to-r from-[#121a17] via-[#59432855] to-[#1c241c] shadow-[0_20px_45px_#000] [transform:perspective(700px)_rotateY(-8deg)] md:top-92 md:left-[7%]" />
      <KaraokeTVPreview />
      <MobileQueuePreview />
      <div className="absolute right-[-3px] bottom-[23px] flex rotate-2 items-center gap-1.5 rounded-[11px] border border-white/9 bg-[#121b1bef] p-[9px] shadow-[0_10px_35px_#0005] md:-right-[1%] md:bottom-12 md:gap-2.5 md:px-4 md:py-[13px]">
        <span className="rounded-full bg-landing-accent/10 p-1 text-landing-accent md:p-1.5">
          <Check className="size-[11px] md:size-3.5" />
        </span>
        <div>
          <b className="block text-[7px] md:text-[10px]">
            One room. Everyone's playlist.
          </b>
          <small className="mt-1 block text-[6px] text-[#98a7ab] md:text-[8px]">
            More singing. Less passing the remote.
          </small>
        </div>
      </div>
      <figcaption className="absolute right-0 -bottom-[15px] text-[5px] tracking-[0.9px] text-[#7d8b92] md:-bottom-[19px] md:text-[7px] md:tracking-[1.4px]">
        PRODUCT PREVIEW · SAMPLE SONGS & ROOM
      </figcaption>
    </figure>
  )
}

const steps = [
  {
    icon: Monitor,
    title: 'Host on TV',
    body: 'Create a room, show the QR code, and control YouTube playback from one device.',
  },
  {
    icon: Smartphone,
    title: 'Join by code',
    body: 'Friends scan the QR or enter a short room code on their phones.',
  },
  {
    icon: Search,
    title: 'Search & queue',
    body: "Find your song, add it to the queue, and see who's up next.",
  },
  {
    icon: Users,
    title: 'Sing together',
    body: 'Everyone gets their moment. No remote. No interruptions. Just good vibes.',
  },
]
const features = [
  {
    icon: Users,
    title: 'Made for groups',
    body: 'For parties, barkada hangouts, and one-more-song nights.',
  },
  {
    icon: Monitor,
    title: 'Uses YouTube',
    body: 'Find your favorite karaoke videos with YouTube playback.',
  },
  {
    icon: Smartphone,
    title: 'No app needed',
    body: 'Join from your phone. All you need is a browser.',
  },
  {
    icon: Heart,
    title: 'Keeps the vibe',
    body: 'A shared queue. A turn for everyone. Zero remote drama.',
  },
]

export function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading)
    return (
      <div className="flex min-h-svh items-center justify-center" role="status">
        Loading…
      </div>
    )
  if (isAuthenticated) return <Navigate to="/home" replace />
  return (
    <div
      data-landing
      className="overflow-clip bg-[#080b0d] text-[#f8fafa] [&_a:focus-visible]:outline-3 [&_a:focus-visible]:outline-offset-5 [&_a:focus-visible]:outline-[#00e5c2] [&_button:focus-visible]:outline-3 [&_button:focus-visible]:outline-offset-5 [&_button:focus-visible]:outline-[#00e5c2] motion-reduce:[&_*]:transition-none motion-reduce:[&_*]:animate-none"
    >
      <a
        className="absolute -top-25 left-5 z-60 bg-landing-accent px-5 py-3 text-[#080b0d] focus:top-3"
        href="#main-content"
      >
        Skip to content
      </a>
      <header className="relative z-10 border-b border-white/6">
        <div
          className={cn(
            container,
            'flex min-h-[74px] flex-wrap items-center justify-between gap-3 py-4 md:min-h-[86px] md:flex-nowrap md:gap-9 md:py-0',
          )}
        >
          <Brand />
          <nav
            aria-label="Main navigation"
            className="order-3 mt-[5px] flex w-full justify-center gap-7.5 text-xs text-[#d2d9db] md:order-none md:mt-0 md:ml-auto md:w-auto md:gap-8 md:text-sm"
          >
            <a href="#how-it-works" className="hover:text-landing-accent">
              How it works
            </a>
            <a href="#features" className="hover:text-landing-accent">
              Features
            </a>
          </nav>
          <GoogleSignInButton
            className="h-9 rounded-lg bg-landing-accent px-3 text-xs text-[#06110e] hover:bg-[#20ebbc] motion-safe:hover:-translate-y-0.5 md:h-10.5 md:px-[19px] md:text-sm"
            label="Sign in"
          />
        </div>
      </header>
      <main id="main-content">
        <section
          className={cn(
            container,
            'relative grid grid-cols-1 items-center gap-4 pt-[35px] pb-11 before:pointer-events-none before:absolute before:-top-[230px] before:-left-[500px] before:h-[650px] before:w-[850px] before:bg-radial-[ellipse,#00d6a013,transparent_65%] md:gap-2.5 md:pt-12 md:pb-18 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-3.5 lg:pt-15',
          )}
          aria-labelledby="hero-title"
        >
          <div className="relative z-2 min-w-0 md:text-center lg:text-left">
            <p
              className={cn(
                eyebrow,
                'inline-flex items-center gap-2.5 rounded-full border border-landing-accent/22 bg-landing-accent/3 px-[13px] py-[7px]',
              )}
            >
              <span className="size-1.5 rounded-full bg-[#00e5b0] shadow-[0_0_10px_#00d6a077]" />
              SHARED KARAOKE QUEUE
            </p>
            <h1
              id="hero-title"
              className="mt-[21px] mb-[21px] text-[clamp(39px,7.8vw,58px)] leading-[1.12] font-[750] tracking-[-2px] md:mt-[23px] md:text-[64px] md:leading-[1.08] md:tracking-[-3px] lg:text-[clamp(48px,4.4vw,66px)] lg:max-[1200px]:text-[52px]"
            >
              Sing together.
              <br />
              <span className="bg-linear-[105deg,#00dfd4,#00d693_85%] bg-clip-text text-transparent">
                No remote
                <br className="hidden lg:max-[1200px]:inline" /> required.
              </span>
            </h1>
            <p className="max-w-full text-[15px] leading-[1.8] text-[#aab5b9] md:mx-auto md:max-w-140 md:text-[17px] md:leading-[1.75] lg:mx-0 lg:max-w-125 lg:max-[1200px]:text-[15px]">
              Turn any TV into a group karaoke session. Guests join from their
              phones, search, queue, and take turns — without interrupting the
              current singer.
            </p>
            <div className="md:flex md:justify-center lg:justify-start">
              <LandingActions />
            </div>
            <ul className="mt-[21px] flex flex-wrap gap-[9px] text-[8px] text-[#bac3c5] min-[421px]:gap-3 min-[421px]:text-[9px] md:mt-[25px] md:justify-center md:gap-5 md:text-[11px] lg:justify-start lg:max-[1200px]:gap-3 lg:max-[1200px]:text-[10px]">
              {[
                'Free to use',
                'No app installation',
                'Works on any device',
              ].map((text) => (
                <li key={text} className="flex items-center gap-1 md:gap-[7px]">
                  <Check
                    aria-hidden="true"
                    className="size-3 text-landing-accent md:size-[15px]"
                  />
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <ProductShowcase />
        </section>
        <section
          className={cn(container, 'scroll-mt-8 pt-[7px]')}
          id="how-it-works"
          aria-labelledby="how-title"
        >
          <div className="text-center">
            <p className={eyebrow}>HOW IT WORKS</p>
            <h2 id="how-title" className={cn(sectionHeading, 'mt-[9px]')}>
              From couch to concert in seconds.
            </h2>
            <p className="mt-[11px] text-xs text-[#8f9da2] md:text-sm">
              One screen. A few friends. All your favorite songs.
            </p>
          </div>
          <div className="mt-[25px] grid grid-cols-1 gap-3 md:mt-8 md:grid-cols-2 md:gap-4.5 lg:grid-cols-4 lg:gap-5.5">
            {steps.map(({ icon: Icon, title, body }, index) => (
              <article
                className="relative rounded-[13px] border border-white/9 bg-linear-[140deg,#141c1e80,#0a101166] p-5.5 pl-19.5 transition-[transform,border-color,background] duration-250 hover:border-landing-accent/33 hover:bg-[#111c1c] motion-safe:hover:-translate-y-[5px] md:p-6"
                key={title}
              >
                <div className="mb-2.5 flex items-center justify-between md:mb-[23px]">
                  <span className="absolute top-[23px] left-5.5 grid size-8 place-items-center rounded-full bg-[#202a2d] text-[11px] font-semibold text-[#c8d4d6] md:static">
                    0{index + 1}
                  </span>
                  <Icon
                    className="size-[27px] stroke-[1.7] text-[#00dfac] md:size-7.5"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="text-base font-[650] tracking-[-0.4px]">
                  {title}
                </h3>
                <p className="mt-[7px] text-xs leading-[1.85] text-[#a2afb3] md:mt-[9px] md:text-[13px] lg:text-xs">
                  {body}
                </p>
                {index < 3 && (
                  <ArrowRight
                    className="absolute top-1/2 -right-5 z-1 hidden size-4.5 bg-[#080b0d] text-landing-accent lg:block"
                    aria-hidden="true"
                  />
                )}
              </article>
            ))}
          </div>
        </section>
        <section
          className={cn(container, 'scroll-mt-8 pt-5 md:pt-6.5')}
          id="features"
          aria-label="Made for your next karaoke night"
        >
          <div className="grid grid-cols-1 gap-[25px] rounded-[13px] border border-white/7 bg-linear-[120deg,#11191b88,#0d14144d] p-[25px] md:grid-cols-2 md:gap-7.5 md:px-6 md:py-7 lg:grid-cols-4 lg:gap-7 lg:max-[1200px]:gap-4.5 lg:max-[1200px]:px-4.5 lg:max-[1200px]:py-6">
            {features.map(({ icon: Icon, title, body }) => (
              <article
                className="flex items-start gap-4.5 md:gap-3.5 lg:max-[1200px]:gap-2.5"
                key={title}
              >
                <Icon
                  className="size-[27px] shrink-0 stroke-[1.7] text-landing-accent md:size-[29px]"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="text-sm font-[650] tracking-[-0.4px] lg:text-[13px]">
                    {title}
                  </h3>
                  <p className="mt-[5px] text-xs leading-[1.8] text-[#a2afb3] md:mt-1.5 lg:text-[11px]">
                    {body}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section
          className={cn(
            container,
            'bg-radial-[ellipse_at_50%_80%,#00d6a009,transparent_65%] pt-14.5 pb-12 text-center md:pt-21.5 md:pb-18.5',
          )}
          aria-labelledby="closing-title"
        >
          <div className="mx-auto mb-[19px] grid size-[47px] place-items-center rounded-[14px] border border-landing-accent/18 bg-landing-accent/4 text-landing-accent">
            <Mic2 className="size-[25px]" aria-hidden="true" />
          </div>
          <p className={eyebrow}>GOOD FRIENDS. GREAT CHORUSES.</p>
          <h2 id="closing-title" className={cn(sectionHeading, 'mt-3')}>
            Your next karaoke night starts here.
          </h2>
          <p className="mt-[15px] text-[13px] leading-[1.8] text-[#a2afb3] md:text-sm">
            Bring your friends. Pick your songs. Let everyone have their turn.
          </p>
          <LandingActions centered />
        </section>
      </main>
      <footer
        className={cn(
          container,
          'flex flex-col items-start justify-between gap-5 border-t border-white/7 py-[29px] md:flex-row md:items-center',
        )}
      >
        <div>
          <Brand compact />
          <p className="mt-[9px] text-[10px] text-[#89979d] md:text-[11px]">
            A little less remote. A lot more together.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center justify-between gap-5 text-[11px] text-[#89979d] md:w-auto md:gap-7">
          <BuyMeCoffeeLink className="w-auto bg-transparent px-0 py-2 text-[#b3c0c3] [&>span]:font-sans [&>span]:text-xs [&>svg]:size-4.5 [&>svg]:text-landing-accent" />
          <span>© {new Date().getFullYear()} Barkadaoke</span>
        </div>
      </footer>
    </div>
  )
}
