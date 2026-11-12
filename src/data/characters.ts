import chisatoCafeImg from '../../image/Chisato Nishikigi 🛐❤️.jpg';
import chisatoDossierImg from '../../image/Design gfx.jpg';
import takinaDossierImg from '../../image/Inoue Takina.jpg';
import spiderLilyPosterImg from '../../image/flower poster_ lycoris.jpg';
import lycorisDuoImg from '../../image/【情報】Lycoris Recoil 官方圖整理(圖多注意，11_12更新5F) @Lycoris Recoil 哈啦板 - 巴哈姆特.jpg';
import type { CharacterMediaItem } from '../types/paint';

export const CHARACTER_GALLERY: CharacterMediaItem[] = [
  {
    id: 'chisato-cafe',
    title: 'Chisato Nishikigi',
    subtitle: 'Café LycoReco Mode',
    character: 'chisato',
    tag: '01 // DIRECT ATTACK',
    src: chisatoCafeImg,
    objectPosition: 'object-[50%_18%]',
    caption: 'Senyum ceria di Café LycoReco — siap membidik grid kontribusi dengan peluru karet non-lethal!',
  },
  {
    id: 'takina-dossier',
    title: 'Inoue Takina',
    subtitle: 'First Lycoris Tactical Sheet',
    character: 'takina',
    tag: '02 // PRECISION AGENT',
    src: takinaDossierImg,
    objectPosition: 'object-[50%_14%]',
    caption: 'Efisien, presisi tinggi, dan selalu menjaga kerapian jadwal commit serta parfait spesial.',
  },
  {
    id: 'lycoris-duo',
    title: 'Chisato & Takina',
    subtitle: 'Lycoris Recoil Official Pair',
    character: 'duo',
    tag: 'DUO // LYCORECO',
    src: lycorisDuoImg,
    objectPosition: 'object-[50%_12%]',
    caption: 'Partner terbaik untuk menjaga streak GitHub harianmu tetap hidup sepanjang tahun.',
  },
  {
    id: 'chisato-gfx',
    title: 'Direct Attack Profile #01',
    subtitle: 'Chisato Agent Dossier',
    character: 'chisato',
    tag: 'FILE // 09-23',
    src: chisatoDossierImg,
    objectPosition: 'object-top',
    caption: 'Arsip karakter Chisato — "Making your own decisions saves you from regret!"',
  },
  {
    id: 'spider-lily',
    title: 'Spider Lily (Higanbana)',
    subtitle: 'Crimson Lycoris Emblem',
    character: 'motif',
    tag: 'MOTIF // SCARLET',
    src: spiderLilyPosterImg,
    objectPosition: 'object-top',
    caption: 'Bunga Higanbana merah menyala yang menjadi simbol sekaligus inspirasi template pixel art.',
  },
];

export const THEME_HERO_MEDIA = {
  chisato: chisatoCafeImg,
  chisatoAlt: chisatoDossierImg,
  takina: takinaDossierImg,
  duo: lycorisDuoImg,
  motif: spiderLilyPosterImg,
};

