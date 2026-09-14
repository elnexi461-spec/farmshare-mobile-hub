import sprite from '@/assets/mifugo-animal-sprite.jpg'

const positions: Record<string, string> = {
  duck: '0% 0%', rabbit: '50% 0%', hen: '100% 0%', goat: '0% 33.333%', sheep: '50% 33.333%', pig: '100% 33.333%', donkey: '0% 66.666%', cow: '50% 66.666%', camel: '100% 66.666%', horse: '0% 100%', bull: '50% 100%', calf: '100% 100%'
}

export function AnimalArt({ animal, className = '' }: { animal: string; className?: string }) {
  return <div role="img" aria-label={`${animal} portrait`} className={`bg-cover bg-no-repeat ${className}`} style={{ backgroundImage: `url(${sprite})`, backgroundSize: '300% 400%', backgroundPosition: positions[animal] ?? positions['cow'] }} />
}
