/* ════════════════════════════════════════════════════════════════
   MYTHIKA — ROSTER
   ════════════════════════════════════════════════════════════════
   This is the ONLY file you should need to edit to add, remove, or
   rebalance a character. It has no dependency on any other script
   and is loaded before every game mode (gacha, battle, and — in
   future — Chess, Memory Match, Lore Trivia).

   HOW TO ADD A CHARACTER
   ─────────────────────
   Copy an existing entry, give it a unique `id`, and fill in every
   field below. Order in this file does not matter — rarity and
   sorting are handled by the game code, not by position here.

   FIELD REFERENCE
   ─────────────────────
   id         string, required, UNIQUE. Lowercase, underscores only
             (e.g. 'king_arthur'). Used as the save-file key for
             unlocks — DO NOT change an existing id after players
             have unlocked that character, or their unlock will be
             orphaned (they'll lose credit for owning it).

   name       Display name shown everywhere in the UI.

   title      Short epithet shown under the name
             (e.g. "The Once and Future King").

   rarity     Integer 1–5. Controls gacha pull odds, star display,
             and rarity glow colour. Current pull weights (defined
             in the game code, not here) are:
               1★: 38%   2★: 26%   3★: 22%   4★: 10%   5★: 4%
             Adding many characters at one rarity tier dilutes the
             odds of pulling any single one of them.

   origin     Short source attribution shown on the card
             (e.g. "Greek Mythology", "Arthurian Legend · Britain").

   lore       1–3 sentences of flavour text shown on summon and in
             the Dex detail sheet. This is pure narrative flavour —
             it has NO effect on gameplay. Write anything you like.

   element    One word: Solar, Water, Earth, Fire, Wind, Storm,
             Lightning, Arcane, Spirit, Divine. Purely cosmetic
             (used for the fallback SVG icon) — has no mechanical
             effect currently.

   archetype  One word describing the character's role
             (e.g. Sovereign, Warrior, Trickster, Sage). Cosmetic
             only at present — reserved for future team-synergy
             mechanics.

   stats      Object with four integers, each 1–99:
               { Power, Speed, Wisdom, Fortune }
             Power  → drives attack damage and skill damage.
             Speed  → small bonus to damage when attacker's Speed
                      exceeds the defender's Speed.
             Wisdom → drives heal amount and a portion of skill
                      damage.
             Fortune → currently cosmetic / reserved for future
                      economy or luck-based mechanics.

   abilities  Array of 1–2 objects: { name, desc, type }
               name   Short skill name shown in battle and tooltips.
               desc   Flavour text describing the skill. This is
                      DISPLAY TEXT ONLY as of this schema version —
                      the game engine does NOT parse this string to
                      decide behaviour. Write whatever fits the
                      character; it will never change how the skill
                      actually functions in battle.
               type   REQUIRED. One of:
                        'damage' — deals damage to a chosen enemy.
                                   Damage = Power×0.65 + Wisdom×0.15
                        'heal'   — heals the caster.
                                   Heal amount = Wisdom×0.3 + 10
                      These are the only two types the current
                      battle engine implements. Additional types
                      (buff / debuff / stun / aoe) are reserved for
                      a future engine update — do not invent new
                      type values, they will be ignored and treated
                      as no-ops.

   palette    Array of exactly 3 hex colour strings used ONLY as a
             fallback when the character's image (below) fails to
             load. [primary, secondary, accent].

   img        Relative path to the character's portrait image,
             e.g. 'art/king_arthur.jpg'. If the file is missing or
             fails to load, a generated placeholder using `palette`
             and `element` is shown automatically — the game never
             breaks from a missing image, so it's safe to add a
             character before its art exists.

   ────────────────────────────────────────────────────────────────
   BALANCE NOTE: total stat sum across (Power+Speed+Wisdom+Fortune)
   for existing characters ranges roughly 240–360 depending on
   rarity. Keep new characters roughly in line with existing peers
   at the same rarity so summon odds stay meaningful.
   ════════════════════════════════════════════════════════════════ */

const ROSTER=[
  // ── 5★ LEGENDS ──
  {id:'king_arthur',name:'King Arthur',title:'The Once and Future King',rarity:5,origin:'Arthurian Legend · Britain',
   lore:'He drew the sword from the stone not through strength but through destiny — a boy who became the template for every righteous king who followed. He waits still, they say, to return when Britain needs him most.',
   element:'Solar',archetype:'Sovereign',stats:{Power:90,Speed:75,Wisdom:88,Fortune:92},
   abilities:[{name:'Excalibur',desc:'Strikes with divine light — deals double damage to shadow-type enemies.',type:'damage'},{name:'Round Table',desc:'Rallies all allies; each gains full HP restoration once per battle.',type:'heal'}],
   palette:['#d4af37','#1e3a5f','#f0ecdf'],img:'art/king_arthur.jpg'},
  {id:'hercules',name:'Hercules',title:'Son of Zeus, Champion of Twelve Labours',rarity:5,origin:'Greek Mythology',
   lore:'He strangled serpents in his crib, slew the Nemean Lion barehanded, and held up the sky on his shoulders to give Atlas a brief rest. His power was never the question. His wisdom always was.',
   element:'Earth',archetype:'Berserker',stats:{Power:99,Speed:70,Wisdom:60,Fortune:78},
   abilities:[{name:'Twelve Labours',desc:'Unstoppable charge — attacks all enemies simultaneously.',type:'damage'},{name:'Lion Skin',desc:'Immune to physical damage for 1 turn.',type:'damage'}],
   palette:['#92400e','#d4af37','#f0ecdf'],img:'art/hercules.jpg'},
  {id:'achilles',name:'Achilles',title:'The Invincible Warrior of Troy',rarity:5,origin:'Greek Mythology / Iliad',
   lore:'Nearly immortal, dipped in the River Styx by his divine mother — every part of him impervious except the heel she held. He chose a short glorious life over a long forgotten one. Troy remembers.',
   element:'Wind',archetype:'Warrior',stats:{Power:97,Speed:99,Wisdom:65,Fortune:55},
   abilities:[{name:'Wrath of Peleus',desc:'Enters a berserker state — attack doubles for 3 turns but cannot retreat.',type:'damage'},{name:'Divine Armour',desc:'Reduces all incoming damage by 80% for 1 turn.',type:'damage'}],
   palette:['#d4af37','#dc2626','#f0ecdf'],img:'art/achilles.jpg'},
  {id:'sun_wukong',name:'Sun Wukong',title:'The Eternal Pilgrim King',rarity:5,origin:'Journey to the West · China',
   lore:'Born from cosmic stone, crowned king of ten-thousand monkeys, and brazen enough to crash the Jade Emperor\'s Peach Banquet. His legend is not of victory alone — it is of a spirit so restless even Heaven could not cage it.',
   element:'Storm',archetype:'Trickster',stats:{Power:94,Speed:99,Wisdom:72,Fortune:85},
   abilities:[{name:'72 Transformations',desc:'Shifts form mid-battle; each transformation grants a new ability.',type:'damage'},{name:'Ruyi Jingu Bang',desc:'Staff expands from needle to pillar — bypasses all armour.',type:'damage'}],
   palette:['#f59e0b','#dc2626','#1e40af'],img:'art/sun_wukong.jpg'},
  {id:'thor',name:'Thor',title:'God of Thunder, Son of Odin',rarity:5,origin:'Norse Mythology',
   lore:'Mjolnir returns to his hand like a boomerang of divine wrath. He drinks oceans, arm-wrestles old age itself, and dies in glory against the World Serpent at Ragnarök — only to be reborn when the new world rises.',
   element:'Lightning',archetype:'Guardian',stats:{Power:96,Speed:82,Wisdom:68,Fortune:80},
   abilities:[{name:'Mjolnir Strike',desc:'Lightning hammer throw — stuns the target for 1 turn.',type:'damage'},{name:'God of Thunder',desc:'Calls a storm that deals 6 lightning damage to all enemies.',type:'damage'}],
   palette:['#60a5fa','#1e293b','#d4af37'],img:'art/thor.jpg'},
  {id:'cleopatra',name:'Cleopatra VII',title:'Empress of the Serpent Throne',rarity:5,origin:'Ptolemaic Egypt · 69–30 BCE',
   lore:'She spoke nine languages, ruled the wealthiest kingdom alive, and bent Rome\'s greatest generals through pure wit. Reborn in Mythika as an Arcane Empress whose golden asp staff channels the undivided power of the Nile.',
   element:'Arcane',archetype:'Sovereign',stats:{Power:71,Speed:68,Wisdom:99,Fortune:95},
   abilities:[{name:'Nile\'s Blessing',desc:'Floods the field with golden mana — doubles resource gain for 3 turns.',type:'damage'},{name:'Asp of Ra',desc:'Afflicts one enemy: their buffs become debuffs.',type:'damage'}],
   palette:['#d4af37','#1a3a2a','#8b0000'],img:'art/cleopatra.jpg'},
  // ── 4★ HEROES ──
  {id:'merlin',name:'Merlin',title:'Architect of the Once and Future',rarity:4,origin:'Arthurian Legend · Britain',
   lore:'He lived backwards through time, which is why he always seemed to know what was coming. It wasn\'t prophecy — it was memory. He has already seen how every story ends.',
   element:'Arcane',archetype:'Sage',stats:{Power:70,Speed:55,Wisdom:97,Fortune:76},
   abilities:[{name:'Retrograde Vision',desc:'View and rearrange the bottom 5 cards of your deck freely.',type:'damage'},{name:'Avalon Seal',desc:'Imprisons one enemy card for 2 turns.',type:'damage'}],
   palette:['#1e3a5f','#6b21a8','#d4af37'],img:'art/merlin.jpg'},
  {id:'loki',name:'Loki',title:'Trickster of Asgard, Father of Monsters',rarity:4,origin:'Norse Mythology',
   lore:'He shape-shifts, lies, schemes, and occasionally saves the day through methods nobody approved of in advance. Every Norse catastrophe has his fingerprints on it. So does every solution.',
   element:'Arcane',archetype:'Trickster',stats:{Power:68,Speed:92,Wisdom:88,Fortune:72},
   abilities:[{name:'Shapeshifter',desc:'Copies the last ability used by any card on the field.',type:'damage'},{name:'Silver Tongue',desc:'Converts one enemy to fight for your side for 2 turns.',type:'damage'}],
   palette:['#1a5c1a','#0f172a','#c77dff'],img:'art/loki.jpg'},
  {id:'anubis',name:'Anubis',title:'Weigher of Souls, Lord of the Dead',rarity:4,origin:'Egyptian Mythology',
   lore:'He waits at the threshold with a feather and a set of scales. Every soul that dies passes through his hall. He is not cruel — merely absolute. The scales do not lie.',
   element:'Spirit',archetype:'Oracle',stats:{Power:78,Speed:65,Wisdom:95,Fortune:88},
   abilities:[{name:'Feather of Ma\'at',desc:'Instantly defeats any enemy with less than 20% HP remaining.',type:'damage'},{name:'Death Rite',desc:'Heals your team for 15% of all damage dealt this turn.',type:'heal'}],
   palette:['#1c1917','#d4af37','#0f4c2f'],img:'art/anubis.jpg'},
  {id:'medusa',name:'Medusa',title:'The Gorgon Whose Gaze Ends Worlds',rarity:4,origin:'Greek Mythology',
   lore:'She was turned into a monster as punishment for being victimised — and then punished again for being a monster. In Mythika, the injustice is the power. Her gaze has learned to be selective.',
   element:'Arcane',archetype:'Wildcard',stats:{Power:82,Speed:74,Wisdom:80,Fortune:68},
   abilities:[{name:'Petrifying Gaze',desc:'Freezes one enemy in stone — they cannot move for 2 turns.',type:'damage'},{name:'Serpent Mane',desc:'Each serpent strikes randomly — deals 1–8 damage three times.',type:'damage'}],
   palette:['#14532d','#7c2d12','#4f46e5'],img:'art/medusa.jpg'},
  {id:'dracula',name:'Dracula',title:'Prince of Darkness, Lord of Vampires',rarity:4,origin:'Bram Stoker / Transylvanian Legend',
   lore:'He was Vlad Dracula before he was a vampire — a warlord who impaled thousands. In Stoker\'s hands he became something even more terrifying: elegant, patient, and certain you would come to him.',
   element:'Spirit',archetype:'Sovereign',stats:{Power:85,Speed:88,Wisdom:85,Fortune:70},
   abilities:[{name:'Blood Drain',desc:'Steals 8 HP from the target and adds it to your own.',type:'damage'},{name:'Children of the Night',desc:'Summons a bat swarm — each bat deals 2 damage.',type:'damage'}],
   palette:['#1c1917','#7c2d12','#4f46e5'],img:'art/dracula.jpg'},
  {id:'robin_hood',name:'Robin Hood',title:'Outlaw of Sherwood, Arrow of the People',rarity:4,origin:'English Folklore · 13th century',
   lore:'He stole from the rich not because it was legal but because it was right — and in the gap between those two things he found his entire life\'s work. The forest remembers every arrow.',
   element:'Wind',archetype:'Rogue',stats:{Power:78,Speed:95,Wisdom:80,Fortune:90},
   abilities:[{name:'Perfect Shot',desc:'Guaranteed critical hit — deals 150% normal damage.',type:'damage'},{name:'Merry Band',desc:'Calls allies from the forest — summons 2 random support cards.',type:'damage'}],
   palette:['#14532d','#92400e','#d4af37'],img:'art/robin_hood.jpg'},
  {id:'odysseus',name:'Odysseus',title:'The Wiliest Man in Greece',rarity:4,origin:'Greek Mythology / Odyssey',
   lore:'He won the Trojan War with a wooden horse, survived a Cyclops, Sirens, Scylla, and Charybdis, and still took ten years to get home because the gods kept arguing about him. He never stopped thinking.',
   element:'Wind',archetype:'Strategist',stats:{Power:76,Speed:80,Wisdom:97,Fortune:82},
   abilities:[{name:'Trojan Stratagem',desc:'Hides a trap — the next enemy action triggers 12 bonus damage.',type:'damage'},{name:'Sailor\'s Cunning',desc:'Negates the next 2 harmful effects targeting your side.',type:'damage'}],
   palette:['#1e3a5f','#d4af37','#92400e'],img:'art/odysseus.jpg'},
  {id:'alexander',name:'Alexander the Great',title:'Conqueror of the Known World',rarity:4,origin:'Macedon · 356–323 BCE',
   lore:'He conquered Persia at 22, Egypt at 23, and kept going east until his generals mutinied. He named twenty cities after himself. He wept, they say, because there were no more worlds to conquer.',
   element:'Fire',archetype:'Strategist',stats:{Power:92,Speed:86,Wisdom:90,Fortune:75},
   abilities:[{name:'Phalanx Formation',desc:'All allies gain a shield absorbing 8 damage this turn.',type:'damage'},{name:'World Conqueror',desc:'Deals bonus damage equal to 10% of the enemy\'s max HP.',type:'damage'}],
   palette:['#d4af37','#1e3a5f','#dc2626'],img:'art/alexander.jpg'},
  // ── 3★ SPIRITS ──
  {id:'beowulf',name:'Beowulf',title:'Slayer of Grendel, Hero of the Geats',rarity:3,origin:'Old English Poem · ~700 CE',
   lore:'He swam through monster-infested waters for sport, ripped Grendel\'s arm off bare-handed just to prove a point, fought a dragon in old age and won — while dying. He set an impossible standard for heroism.',
   element:'Earth',archetype:'Warrior',stats:{Power:93,Speed:72,Wisdom:65,Fortune:70},
   abilities:[{name:'Grendel\'s Bane',desc:'Ignores enemy armour entirely — deals full raw damage.',type:'damage'},{name:'Last Stand',desc:'When HP drops below 25%, attack doubles until battle ends.',type:'damage'}],
   palette:['#1c1917','#92400e','#d4af37'],img:'art/beowulf.jpg'},
  {id:'sinbad',name:'Sinbad the Sailor',title:'Navigator of the Impossible Voyage',rarity:3,origin:'One Thousand and One Nights · Persia',
   lore:'Seven voyages. Each one more impossible than the last — giant rocs, diamond valleys, magnetic mountains, a city of the dead. He survived them all and came home rich every time. Luck, skill, or something else entirely.',
   element:'Water',archetype:'Explorer',stats:{Power:74,Speed:86,Wisdom:80,Fortune:95},
   abilities:[{name:'Seventh Voyage',desc:'A random extremely powerful event occurs — for better or worse.',type:'damage'},{name:'Trade Wind',desc:'Draw 2 cards and gain 5 gems.',type:'damage'}],
   palette:['#1e3a5f','#d4af37','#0f4c2f'],img:'art/sinbad.jpg'},
  {id:'momotaro',name:'Momotaro',title:'Peach Boy, Demon Island Conqueror',rarity:3,origin:'Japanese Folklore',
   lore:'Born from a giant peach floating down a river, he grew up to lead a dog, a monkey, and a pheasant against an island of oni demons — and won. In Japan he is the archetype of pure-hearted heroism.',
   element:'Solar',archetype:'Hero',stats:{Power:82,Speed:84,Wisdom:72,Fortune:88},
   abilities:[{name:'Kinbi Dango',desc:'Shares millet dumplings — all allies regain 10 HP.',type:'heal'},{name:'Animal Companions',desc:'Dog, monkey, and pheasant each strike for 4 damage.',type:'damage'}],
   palette:['#f59e0b','#dc2626','#f0ecdf'],img:'art/momotaro.jpg'},
  {id:'joan_arc',name:'Joan of Arc',title:'The Maid of Burning Heaven',rarity:3,origin:'France · 1412–1431',
   lore:'She heard voices at thirteen, led an army at seventeen, and was burned at nineteen. Five hundred years later they are still arguing about her. That is a kind of immortality.',
   element:'Solar',archetype:'Warrior',stats:{Power:86,Speed:78,Wisdom:74,Fortune:68},
   abilities:[{name:'Divine Standard',desc:'Rallies all allies — each gains +4 attack for 2 turns.',type:'damage'},{name:'Martyr\'s Flame',desc:'On defeat, deals 15 damage to all enemies.',type:'damage'}],
   palette:['#1d4ed8','#dc2626','#fbbf24'],img:'art/joan_arc.jpg'},
  {id:'sherlock',name:'Sherlock Holmes',title:'The World\'s Only Consulting Detective',rarity:3,origin:'Arthur Conan Doyle · 1887',
   lore:'He sees what others overlook — every stain, every posture, every hesitation a chapter in a story others haven\'t begun reading. Elementary, he says, meaning: obvious, once you are him.',
   element:'Arcane',archetype:'Scholar',stats:{Power:60,Speed:78,Wisdom:99,Fortune:82},
   abilities:[{name:'Deduction',desc:'Reveals enemy\'s full strategy — view their entire hand and deck order.',type:'damage'},{name:'The Game is Afoot',desc:'Dodges the next 2 attacks with perfect precision.',type:'damage'}],
   palette:['#1e293b','#d4af37','#e0e7ff'],img:'art/sherlock.jpg'},
  {id:'frankenstein',name:'Frankenstein\'s Monster',title:'The Created Who Outgrew His Creator',rarity:3,origin:'Mary Shelley · 1818',
   lore:'He was built from corpses and lightning, then abandoned because his creator couldn\'t bear what he\'d made. He taught himself language, philosophy, and grief. He asked for a companion. The answer was no. The answer was a mistake.',
   element:'Lightning',archetype:'Wildcard',stats:{Power:88,Speed:55,Wisdom:72,Fortune:45},
   abilities:[{name:'Galvanic Rage',desc:'Absorbs lightning damage and converts it to healing.',type:'heal'},{name:'Prometheus Unbound',desc:'Breaks all status effects and immunity buffs on all combatants.',type:'damage'}],
   palette:['#1f2937','#4ade80','#6b7280'],img:'art/frankenstein.jpg'},
  {id:'blackbeard',name:'Blackbeard',title:'Terror of the Golden Age of Piracy',rarity:3,origin:'Edward Teach · England/Caribbean · 1680–1718',
   lore:'He lit slow-burning fuses in his beard before battle so he\'d enter the fight wreathed in smoke like a demon from hell. It worked. Nobody asked whether the legend was slightly larger than the man.',
   element:'Fire',archetype:'Berserker',stats:{Power:88,Speed:80,Wisdom:62,Fortune:74},
   abilities:[{name:'Smoking Beard',desc:'Terrorises all enemies — they lose 2 attack each for 3 turns.',type:'damage'},{name:'Broadside Cannon',desc:'Deals 10 damage to one target; 5 splash to adjacent cards.',type:'damage'}],
   palette:['#1c1917','#dc2626','#d4af37'],img:'art/blackbeard.jpg'},
  {id:'spartacus',name:'Spartacus',title:'Gladiator Who Made Rome Flinch',rarity:3,origin:'Thrace / Rome · 111–71 BCE',
   lore:'A Thracian slave who led the largest slave revolt in Roman history, defeated legion after legion, and was only stopped because the Senate sent every general they had at once. Rome never forgot the fear.',
   element:'Fire',archetype:'Warrior',stats:{Power:94,Speed:82,Wisdom:74,Fortune:65},
   abilities:[{name:'Slave\'s Revolt',desc:'All enemy combatants lose 20% HP simultaneously.',type:'damage'},{name:'Arena Fighter',desc:'Gains +3 attack for each defeat he has survived.',type:'damage'}],
   palette:['#7c2d12','#1c1917','#d4af37'],img:'art/spartacus.jpg'},
  {id:'gilgamesh',name:'Gilgamesh',title:'The Two-Thirds God',rarity:3,origin:'Sumer · c.2100 BCE',
   lore:'The oldest recorded hero sought immortality after losing his closest friend, crossed the waters of death, and returned empty-handed. He then had the story inscribed on stone — because that is what lasts.',
   element:'Earth',archetype:'Hero',stats:{Power:91,Speed:74,Wisdom:72,Fortune:66},
   abilities:[{name:'Gate of Babylon',desc:'Launches a volley of ancient weapons — deals 2 damage per card in hand.',type:'damage'},{name:'Wall of Uruk',desc:'Absorbs the next 12 damage received.',type:'damage'}],
   palette:['#d4af37','#7c2d12','#1c1917'],img:'art/gilgamesh.jpg'},
  {id:'mulan',name:'Hua Mulan',title:'The Blade Without Name',rarity:3,origin:'Northern Wei Dynasty · China',
   lore:'She took her father\'s armour and fought twelve years under false stars. In Mythika, Mulan wields two blades that have never once been swung for glory — only for the people she loves.',
   element:'Wind',archetype:'Warrior',stats:{Power:92,Speed:97,Wisdom:88,Fortune:79},
   abilities:[{name:'Twin Crescent Strike',desc:'Dual blade attack that ignores enemy defensive equipment.',type:'damage'},{name:'Iron Will',desc:'Once per battle, survives a killing blow with 1 HP.',type:'damage'}],
   palette:['#dc2626','#1c1917','#fbbf24'],img:'art/mulan.jpg'},
  // ── 2★ WANDERERS ──
  {id:'zorro',name:'Zorro',title:'The Fox Who Brands Tyrants',rarity:2,origin:'Johnston McCulley · California · 1919',
   lore:'He rides at night, leaves a Z carved into every injustice, and by morning is back in his hacienda being boringly aristocratic. The disguise is perfect because nobody believes a nobleman would bother.',
   element:'Wind',archetype:'Rogue',stats:{Power:80,Speed:94,Wisdom:75,Fortune:83},
   abilities:[{name:'The Mark of Zorro',desc:'Brands an enemy — they take 5 extra damage from all sources.',type:'damage'}],
   palette:['#1c1917','#dc2626','#d4af37'],img:'art/zorro.jpg'},
  {id:'tarzan',name:'Tarzan',title:'Lord of the Jungle, Man Raised by Apes',rarity:2,origin:'Edgar Rice Burroughs · 1912',
   lore:'Raised by great apes after his aristocratic parents died in the African jungle, he became something neither man nor beast — and more powerful for it. He learned English from books before he heard it spoken.',
   element:'Earth',archetype:'Warrior',stats:{Power:88,Speed:90,Wisdom:58,Fortune:72},
   abilities:[{name:'Jungle Law',desc:'Summons the jungle — all enemies take 3 poison damage per turn for 3 turns.',type:'damage'}],
   palette:['#14532d','#92400e','#f0ecdf'],img:'art/tarzan.jpg'},
  {id:'peter_pan',name:'Peter Pan',title:'The Boy Who Never Grew Up',rarity:2,origin:'J.M. Barrie · 1902',
   lore:'He lives in Neverland where nobody ages, time doesn\'t stick, and every adventure resets at dawn. This sounds wonderful until you realise he has no idea what he\'s missing. He chose not to know.',
   element:'Wind',archetype:'Trickster',stats:{Power:65,Speed:98,Wisdom:40,Fortune:85},
   abilities:[{name:'Pixie Dust',desc:'Grants flight to all allies — they dodge the next attack each.',type:'damage'}],
   palette:['#14532d','#d4af37','#60a5fa'],img:'art/peter_pan.jpg'},
  {id:'dorian_gray',name:'Dorian Gray',title:'The Portrait That Carries All Sin',rarity:2,origin:'Oscar Wilde · 1890',
   lore:'He sold his aging to a portrait and lived without consequence — every cruelty absorbed by the canvas, his face perpetually young. The debt, when it came due, was catastrophic. Beauty is not innocence.',
   element:'Arcane',archetype:'Wildcard',stats:{Power:60,Speed:75,Wisdom:80,Fortune:85},
   abilities:[{name:'The Portrait',desc:'Transfers all debuffs and status effects from yourself to the enemy.',type:'damage'}],
   palette:['#4f46e5','#fdf4ff','#0f172a'],img:'art/dorian_gray.jpg'},
  {id:'billy_kid',name:'Billy the Kid',title:'The Outlaw No Law Could Hold',rarity:2,origin:'American West · 1859–1881',
   lore:'He killed his first man at seventeen, escaped from jail twice, and was dead by twenty-one. Pat Garrett shot him in the dark. New Mexico still argues about whether he was a villain or a legend. Both, probably.',
   element:'Fire',archetype:'Rogue',stats:{Power:78,Speed:97,Wisdom:55,Fortune:70},
   abilities:[{name:'Quick Draw',desc:'Attacks first this round regardless of speed — deals 9 damage.',type:'damage'}],
   palette:['#92400e','#1c1917','#d4af37'],img:'art/billy_kid.jpg'},
  {id:'sun_tzu',name:'Sun Tzu',title:'Strategist of the Empty Form',rarity:2,origin:'Eastern Zhou · China · 544–496 BCE',
   lore:'The supreme art of war is to subdue the enemy without fighting. He never described what to do when the enemy also read the book. He didn\'t need to.',
   element:'Wind',archetype:'Strategist',stats:{Power:65,Speed:72,Wisdom:99,Fortune:80},
   abilities:[{name:'Empty Form',desc:'Dodge the next attack with perfect certainty and counter for 6 damage.',type:'damage'}],
   palette:['#0f4c2f','#fef3c7','#7c2d12'],img:'art/sun_tzu.jpg'},
  {id:'archimedes',name:'Archimedes',title:'The Mathematician Who Moved the World',rarity:2,origin:'Syracuse · 287–212 BCE',
   lore:'Give me a lever long enough and a fulcrum to place it on, he said, and I shall move the world. He also burned a Roman fleet with mirrors. He was killed by a soldier while drawing mathematics in the sand.',
   element:'Arcane',archetype:'Creator',stats:{Power:55,Speed:58,Wisdom:99,Fortune:72},
   abilities:[{name:'The Lever',desc:'Amplifies the next attack — deals triple damage.',type:'damage'}],
   palette:['#1e3a5f','#d4af37','#e0f2fe'],img:'art/archimedes.jpg'},
  {id:'ching_shih',name:'Ching Shih',title:'Red Flag Queen of Ten Thousand Ships',rarity:2,origin:'China · 1775–1844',
   lore:'She commanded 1800 ships and 80,000 sailors — then negotiated a peaceful retirement and lived to old age. History\'s most successful pirate and its most graceful exit.',
   element:'Water',archetype:'Sovereign',stats:{Power:82,Speed:86,Wisdom:90,Fortune:95},
   abilities:[{name:'Red Flag Fleet',desc:'Deals 2 damage for each card in your discard pile.',type:'damage'}],
   palette:['#dc2626','#1c1917','#d4af37'],img:'art/ching_shih.jpg'},
  // ── 1★ ECHOES ──
  {id:'echo_squire',name:'Squire of the Realm',title:'Bearer of Another\'s Shield',rarity:1,origin:'Archetype',
   lore:'Every legend starts somewhere. Usually carrying someone else\'s luggage.',
   element:'Earth',archetype:'Guardian',stats:{Power:35,Speed:42,Wisdom:38,Fortune:50},
   abilities:[{name:'Shield Bearer',desc:'Takes a hit meant for another ally.',type:'damage'}],palette:['#6b7280','#d1d5db','#1f2937'],img:'art/echo_squire.jpg'},
  {id:'echo_oracle',name:'Wandering Oracle',title:'Speaker of Uncomfortable Truths',rarity:1,origin:'Archetype',
   lore:'She sees what is coming. That doesn\'t make it easier to watch.',
   element:'Arcane',archetype:'Oracle',stats:{Power:28,Speed:40,Wisdom:88,Fortune:72},
   abilities:[{name:'Prophecy',desc:'Reveal the top card of the enemy\'s deck.',type:'damage'}],palette:['#4f46e5','#fdf4ff','#0f172a'],img:'art/echo_oracle.jpg'},
  {id:'echo_pirate',name:'Sea Rogue',title:'Sailor of Uncertain Allegiance',rarity:1,origin:'Archetype',
   lore:'Loyal to whoever is winning, until suddenly they aren\'t.',
   element:'Water',archetype:'Rogue',stats:{Power:42,Speed:72,Wisdom:45,Fortune:68},
   abilities:[{name:'Broadside',desc:'Deals 5 damage; 50% chance to deal 5 to yourself too.',type:'damage'}],palette:['#1e3a5f','#d4af37','#7c2d12'],img:'art/echo_pirate.jpg'},
  {id:'echo_smith',name:'The Blacksmith',title:'Forger of Legends\' Weapons',rarity:1,origin:'Archetype',
   lore:'He made the sword Achilles carried. Nobody remembers his name.',
   element:'Fire',archetype:'Creator',stats:{Power:50,Speed:30,Wisdom:65,Fortune:60},
   abilities:[{name:'Forge',desc:'Give one ally +3 attack permanently.',type:'damage'}],palette:['#92400e','#1c1917','#d4af37'],img:'art/echo_smith.jpg'},
  {id:'echo_bard',name:'Wandering Bard',title:'Singer of Forgotten Roads',rarity:1,origin:'Archetype',
   lore:'All stories begin with someone willing to walk to the next village and tell what they saw.',
   element:'Wind',archetype:'Bard',stats:{Power:25,Speed:50,Wisdom:60,Fortune:65},
   abilities:[{name:'Epic Verse',desc:'Draw 1 card; deal 2 damage to the weakest enemy.',type:'damage'}],palette:['#9ca3af','#fef9ee','#374151'],img:'art/echo_bard.jpg'},
  {id:'echo_monk',name:'Wandering Monk',title:'Seeker of the Middle Path',rarity:1,origin:'Archetype',
   lore:'Enlightenment is just suffering that has found its context.',
   element:'Earth',archetype:'Scholar',stats:{Power:30,Speed:38,Wisdom:80,Fortune:58},
   abilities:[{name:'Meditate',desc:'Heal 6 HP; skip your next attack.',type:'heal'}],palette:['#78350f','#fef9ee','#1e3a5f'],img:'art/echo_monk.jpg'},
];
