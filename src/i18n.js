// =====================================================================
// Vampire Garlic Heist: translations (English, Dutch, Russian, Ukrainian).
// t('key', { n: 3 }) fills in {n}; plural('bulbs', n) picks the right word form.
// To add a language: add it to LANGS and give it a full set of strings below.
// =====================================================================
export const LANGS = [
  { id: 'en', label: 'English' },
  { id: 'nl', label: 'Nederlands' },
  { id: 'ru', label: 'Русский' },
  { id: 'uk', label: 'Українська' }
];

const S = {
  en: {
    eyebrow: 'Play-test prototype · 3D', title1: 'Vampire ', title2: 'Garlic Heist',
    lede: 'The village hung garlic everywhere to keep vampires out. You are the vampires. Steal every bulb and burn it in the castle furnace before the sun comes up.',
    wakeT: 'Wake', wakeD: 'Each player wakes a sleeping bat on the castle wall.',
    grabT: 'Grab & burn', grabD: 'Hover over garlic for 2 seconds, then fly it into the furnace. Garlic is heavy: you fly slower. Every extra bat adds 3 garlic.',
    watchT: 'Watchmen', watchD: 'Each bat has 3 lives. Caught in a lantern’s light while carrying garlic? You lose a life, drop the bulb and fall asleep for a few seconds. Every burned bulb makes the watchmen a little faster.',
    lampsT: 'Lamps & the cat', lampsD: 'Street lamps switch on and off; their light slows your bat down. The cat meows if you fly too close, calling a watchman over.',
    thPlayer: 'Player', thWake: 'Wake up', thFly: 'Fly', thEcho: 'Echolocate',
    click: 'Click', moveMouse: 'Move the mouse', rightClickOr: 'Right-click or', keySpace: 'Space', arrowKeys: 'Arrow keys',
    pad: 'Joy-Con / gamepad', anyButton: 'Shake it!', stick: 'Stick', faceButton: 'Any face button',
    note: 'Echolocation sends sound waves to the garlic closest to your bat and marks it. The echo meter above your bat glows when it is ready again. Fly next to a teammate and press Pass to hand them your garlic. When a bat is in jail, the crowd can clap (or press C) to free it sooner. Lose all 3 lives and a watchman carries your bat off to the jail (bottom right) for 20 seconds; teammates who hover at the jail door break everyone out sooner. Bats still outside the castle at sunrise turn to dust. A bat that sits still for 25 seconds goes back to sleep.',
    escBack: 'returns here.',
    roundLength: 'Round length', min3: '3 min', sec90: '90 sec', sound: 'Sound', on: 'On', off: 'Off', language: 'Language',
    start: 'Start the night', loading: 'Loading the village…', orPress: 'or press', orPad: 'or any controller button', renderer: 'Renderer', preparing: 'Preparing 3D renderer',
    noRenderer: 'This browser could not start the 3D renderer. Try a recent Chrome or Edge with hardware acceleration on.',
    canvasLabel: 'Vampire Garlic Heist: a 3D village at night',
    winEyebrow: 'Total win', caughtEyebrow: 'Every bat got caught', sunEyebrow: 'The sun came up',
    winTitle: 'The village is defenceless!', loseTitle: 'The village survives… for now',
    winQuote: '“You burned {n} {bulbs}! The village is defenceless… mwahaha!”',
    loseQuote: '“You burned {n} {bulbs} before sunrise. Next night, the village falls!”',
    statBurned: 'Garlic bulbs burned', statGolden: 'Golden garlic found', statCaught: 'Times caught in the light', statDust: 'Bats turned to dust',
    newBest: 'New best heist on this computer!', best: 'Best heist on this computer: {n} bulbs burned.',
    again: 'Play again', backMenu: 'Back to menu',
    garlicLeft: '{n} garlic left', burned: 'Burned {n}', sunriseIn: 'Sunrise in {t}', notStarted: 'Night has not started',
    hintAsleep: 'All bats are asleep. Click, press WASD or arrows, or shake a Joy-Con to wake one.',
    hintStart: 'Click, press WASD or arrows, or shake a Joy-Con. The sunrise timer starts with the first bat.',
    chipEchoReady: 'echo ready', chipEcho: 'echo {n}s', chipOut: 'out', chipAsleep: 'asleep', chipGarlic: 'garlic', livesLabel: '{n} lives',
    tagSleep: 'zzz {name}', tagOut: '{name} · out', tagEchoReady: 'Echo ready', tagEcho: 'Echo {n}s',
    bats: ['Mouse', 'Keys 1', 'Keys 2', 'Pad 1', 'Pad 2', 'Pad 3', 'Pad 4'],
    wakeToBegin: 'Wake up a bat to begin!', padConnected: 'Controller {n} connected: shake it to wake a bat',
    yawn: 'yaaawn~', stealBefore: 'Steal the garlic before sunrise!', moreGarlic: 'More bats, bigger heist: +{n} garlic!',
    lifeLost: '−1 ♥  ({n} left)', isOut: '{name} is out!', echoReady: 'echo ready!', hey: 'Hey!', slow: 'slooow…', thief: 'Thief!',
    yuck: 'yuck!', golden: '+3 golden!', whoosh: 'whoosh! +1', nightShift: 'The night shift starts: another watchman!',
    rooster: 'Cock-a-doodle-doo! Back to the castle!', allGone: 'All the garlic is gone! Hold on…', mwahaha: 'MWAHAHA!',
    allCaught: 'Every bat got caught!', meow: 'Meow!', sunPoof: 'The sun is up! Poof…', sunSafe: 'The sun is up! Everyone made it to the castle.',
    thPass: 'Pass garlic', passMouse: 'F or middle-click', passKeys2: 'Right Shift or /', shoulder: 'SL / SR shoulder button', crowd: 'Crowd clapping', micOpt: 'Microphone', sensitivity: 'Sensitivity', sensLow: 'Low', sensMed: 'Medium', sensHigh: 'High', micStarting: 'Asking for the microphone…', micOn: 'Listening. Clap loudly to free bats from jail!', micDenied: 'Microphone blocked. Allow it in the browser’s address bar, or use the C key or the clap button.', micUnavailable: 'No microphone found. Use the C key or the clap button instead.', clapBtn: 'Clap!', clapLabel: 'Crowd clap meter', clapLeft: '+{n}s left', jarLabel: '{n} of {total} garlic bulbs burned', sunLabel: 'Sunrise in {t}',
    tutTitle: 'How to play', tut0: 'Fly to the garlic!', tut1: 'Hover over it to grab it', tut2: 'Burn it in the castle fire!', tut3: 'Stay out of the lantern light!', tutSkip: 'Press any button to skip', tutorial: 'Tutorial', tutGo: 'Go, go, go!', starsLabel: '{n} of 3 stars',
    style: 'Style', stylePainted: 'Painted', styleClean: 'Clean',
    chipCaged: 'caged {n}s', tagCaged: 'Cage {n}s', freeFriend: '{name} is in jail! Fly to the jail door to break them out', jailbreak: 'Jailbreak!', freed: '{name} is free!',
    padCheck: 'Controller check', padHint: 'Move each stick and press buttons: the dot and numbers show which bat that controller drives. Two Joy-Cons that Chrome merged into one show up as a left half and a right half.', padNone: 'not connected: press a button on the controller', padLeftHalf: 'left Joy-Con', padRightHalf: 'right Joy-Con', padRaw: 'Chrome sees {n} gamepad(s):', padHeld: 'Joy-Cons are held', padSideways: 'Sideways', padUpright: 'Upright', padDone: 'Done',
    padConnect: 'Connect Joy-Cons', padConnectHint: 'Chrome asks for each Joy-Con: pick one, click Connect, repeat. Once allowed, they reconnect by themselves.', padNoHid: 'This browser can\'t connect Joy-Cons directly: use Chrome and the start script (not the hosted link).', padPro: 'Pro Controller', padLight: 'light {n}', padShaken: 'shaken!',
    min5: '5 min', clapJail: 'Clap to free the bats in jail faster!',
    bulbs: ['garlic bulb', 'garlic bulbs']
  },
  nl: {
    eyebrow: 'Speeltest-prototype · 3D', title1: 'Vampier ', title2: 'Knoflookroof',
    lede: 'Het dorp heeft overal knoflook opgehangen om vampiers buiten te houden. Maar jullie zijn de vampiers! Steel elke bol en verbrand hem in de oven van het kasteel voordat de zon opkomt.',
    wakeT: 'Wakker worden', wakeD: 'Elke speler maakt een slapende vleermuis op de kasteelmuur wakker.',
    grabT: 'Pakken & verbranden', grabD: 'Hang 2 seconden boven een knoflook en vlieg hem dan naar de oven. Knoflook is zwaar: je vliegt trager. Elke extra vleermuis brengt 3 knoflookbollen meer.',
    watchT: 'Nachtwakers', watchD: 'Elke vleermuis heeft 3 levens. Betrapt in het licht van een lantaarn terwijl je knoflook draagt? Je verliest een leven, laat de bol vallen en valt een paar seconden in slaap. Elke verbrande bol maakt de nachtwakers een beetje sneller.',
    lampsT: 'Lantaarns & de kat', lampsD: 'Straatlantaarns gaan aan en uit; in hun licht vliegt je vleermuis trager. De kat miauwt als je te dichtbij vliegt en roept zo een nachtwaker.',
    thPlayer: 'Speler', thWake: 'Wakker maken', thFly: 'Vliegen', thEcho: 'Echolocatie',
    click: 'Klikken', moveMouse: 'Beweeg de muis', rightClickOr: 'Rechtsklik of', keySpace: 'Spatie', arrowKeys: 'Pijltjestoetsen',
    pad: 'Joy-Con / gamepad', anyButton: 'Schudden!', stick: 'Stick', faceButton: 'Een van de vier knoppen',
    note: 'Echolocatie stuurt geluidsgolven naar de knoflook die het dichtst bij je vleermuis is en markeert die. De echometer boven je vleermuis gloeit als je hem weer kunt gebruiken. Vlieg naast een teamgenoot en druk op Doorgeven om je knoflook af te geven. Zit er een vleermuis in de gevangenis, dan kan het publiek klappen (of op C drukken) om hem sneller te bevrijden. Ben je alle 3 levens kwijt, dan brengt een nachtwaker je vleermuis 20 seconden naar de gevangenis (rechtsonder); teamgenoten die bij de deur zweven, bevrijden iedereen eerder. Vleermuizen die bij zonsopgang nog buiten het kasteel zijn, vergaan tot stof. Een vleermuis die 25 seconden stilzit, gaat weer slapen.',
    escBack: 'brengt je hier terug.',
    roundLength: 'Duur van een ronde', min3: '3 min', sec90: '90 sec', sound: 'Geluid', on: 'Aan', off: 'Uit', language: 'Taal',
    start: 'Begin de nacht', loading: 'Het dorp wordt geladen…', orPress: 'of druk op', orPad: 'of op een knop van een controller', renderer: 'Weergave', preparing: '3D-weergave wordt voorbereid',
    noRenderer: 'Deze browser kon de 3D-weergave niet starten. Probeer een recente versie van Chrome of Edge met hardwareversnelling aan.',
    canvasLabel: 'Vampier Knoflookroof: een 3D-dorp bij nacht',
    winEyebrow: 'Totale overwinning', caughtEyebrow: 'Alle vleermuizen zijn betrapt', sunEyebrow: 'De zon is op',
    winTitle: 'Het dorp is weerloos!', loseTitle: 'Het dorp houdt stand… voorlopig',
    winQuote: '“Jullie hebben {n} {bulbs} verbrand! Het dorp is weerloos… mwahaha!”',
    loseQuote: '“Jullie hebben {n} {bulbs} verbrand voor zonsopgang. Volgende nacht valt het dorp!”',
    statBurned: 'Knoflookbollen verbrand', statGolden: 'Gouden knoflook gevonden', statCaught: 'Keer betrapt in het licht', statDust: 'Vleermuizen tot stof vergaan',
    newBest: 'Nieuw record op deze computer!', best: 'Beste roof op deze computer: {n} bollen verbrand.',
    again: 'Nog een keer', backMenu: 'Terug naar het menu',
    garlicLeft: 'Nog {n} knoflook', burned: 'Verbrand: {n}', sunriseIn: 'Zonsopgang over {t}', notStarted: 'De nacht is nog niet begonnen',
    hintAsleep: 'Alle vleermuizen slapen. Klik, druk op WASD of de pijltjes, of schud een Joy-Con om er een wakker te maken.',
    hintStart: 'Klik, druk op WASD of de pijltjes, of schud een Joy-Con. De tijd tot zonsopgang begint te lopen bij de eerste vleermuis.',
    chipEchoReady: 'echo klaar', chipEcho: 'echo {n}s', chipOut: 'eruit', chipAsleep: 'slaapt', chipGarlic: 'knoflook', livesLabel: '{n} levens',
    tagSleep: 'zzz {name}', tagOut: '{name} · eruit', tagEchoReady: 'Echo klaar', tagEcho: 'Echo {n}s',
    bats: ['Muis', 'Toetsen 1', 'Toetsen 2', 'Pad 1', 'Pad 2', 'Pad 3', 'Pad 4'],
    wakeToBegin: 'Maak een vleermuis wakker om te beginnen!', padConnected: 'Controller {n} verbonden: schud hem om een vleermuis wakker te maken',
    yawn: 'geeeeuw~', stealBefore: 'Steel de knoflook voor zonsopgang!', moreGarlic: 'Meer vleermuizen, grotere roof: +{n} knoflook!',
    lifeLost: '−1 ♥  (nog {n})', isOut: '{name} ligt eruit!', echoReady: 'echo klaar!', hey: 'Hé!', slow: 'traaaag…', thief: 'Dief!',
    yuck: 'bah!', golden: '+3 goud!', whoosh: 'woesj! +1', nightShift: 'De nachtploeg begint: nog een nachtwaker!',
    rooster: 'Kukeleku! Terug naar het kasteel!', allGone: 'Alle knoflook is weg! Even volhouden…', mwahaha: 'MWAHAHA!',
    allCaught: 'Alle vleermuizen zijn betrapt!', meow: 'Miauw!', sunPoof: 'De zon is op! Poef…', sunSafe: 'De zon is op! Iedereen is veilig in het kasteel.',
    thPass: 'Knoflook doorgeven', passMouse: 'F of middelklik', passKeys2: 'Rechter Shift of /', shoulder: 'SL / SR-schouderknop', crowd: 'Publiek klapt', micOpt: 'Microfoon', sensitivity: 'Gevoeligheid', sensLow: 'Laag', sensMed: 'Midden', sensHigh: 'Hoog', micStarting: 'Microfoon aanvragen…', micOn: 'Luistert. Klap hard om vleermuizen uit de gevangenis te bevrijden!', micDenied: 'Microfoon geblokkeerd. Sta hem toe in de adresbalk van de browser, of gebruik de C-toets of de klapknop.', micUnavailable: 'Geen microfoon gevonden. Gebruik de C-toets of de klapknop.', clapBtn: 'Klap!', clapLabel: 'Klapmeter van het publiek', clapLeft: 'nog +{n}s', jarLabel: '{n} van {total} knoflookbollen verbrand', sunLabel: 'Zonsopgang over {t}',
    tutTitle: 'Zo speel je', tut0: 'Vlieg naar de knoflook!', tut1: 'Blijf erboven zweven om hem te pakken', tut2: 'Verbrand hem in het kasteelvuur!', tut3: 'Blijf uit het licht van de lantaarn!', tutSkip: 'Druk op een knop om door te gaan', tutorial: 'Uitleg', tutGo: 'Vliegen maar!', starsLabel: '{n} van 3 sterren',
    style: 'Stijl', stylePainted: 'Geschilderd', styleClean: 'Strak',
    chipCaged: 'in de kooi {n}s', tagCaged: 'Kooi {n}s', freeFriend: '{name} zit in de gevangenis! Vlieg naar de deur om te bevrijden', jailbreak: 'Ontsnapt!', freed: '{name} is vrij!',
    padCheck: 'Controllers testen', padHint: 'Beweeg elke stick en druk op knoppen: de stip en de cijfers tonen welke vleermuis die controller bestuurt. Twee Joy-Cons die Chrome samenvoegt, verschijnen als linker- en rechterhelft.', padNone: 'niet verbonden: druk op een knop van de controller', padLeftHalf: 'linker Joy-Con', padRightHalf: 'rechter Joy-Con', padRaw: 'Chrome ziet {n} gamepad(s):', padHeld: 'Joy-Cons worden vastgehouden', padSideways: 'Zijwaarts', padUpright: 'Rechtop', padDone: 'Klaar',
    padConnect: 'Joy-Cons verbinden', padConnectHint: 'Chrome vraagt naar elke Joy-Con: kies er een, klik op Verbinden, herhaal. Daarna verbinden ze vanzelf opnieuw.', padNoHid: 'Deze browser kan Joy-Cons niet rechtstreeks verbinden: gebruik Chrome en het startscript (niet de online link).', padPro: 'Pro Controller', padLight: 'lampje {n}', padShaken: 'geschud!',
    min5: '5 min', clapJail: 'Klap om de vleermuizen sneller uit de gevangenis te halen!',
    bulbs: ['knoflookbol', 'knoflookbollen']
  },
  ru: {
    eyebrow: 'Прототип для тестирования · 3D', title1: 'Вампирский ', title2: 'чесночный налёт',
    lede: 'Жители деревни развесили повсюду чеснок, чтобы отпугнуть вампиров. Но вампиры — это вы! Украдите каждую головку и сожгите её в печи замка, пока не взошло солнце.',
    wakeT: 'Проснись', wakeD: 'Каждый игрок будит спящую летучую мышь на стене замка.',
    grabT: 'Хватай и сжигай', grabD: 'Повисни над чесноком 2 секунды, а потом отнеси его в печь. Чеснок тяжёлый: с ним летишь медленнее. Каждая новая летучая мышь добавляет 3 головки чеснока.',
    watchT: 'Сторожа', watchD: 'У каждой летучей мыши 3 жизни. Попалась в свет фонаря с чесноком? Теряешь жизнь, роняешь головку и засыпаешь на несколько секунд. Каждая сожжённая головка делает сторожей чуть быстрее.',
    lampsT: 'Фонари и кошка', lampsD: 'Уличные фонари то включаются, то гаснут, и в их свете летучая мышь летит медленнее. Если подлететь к кошке слишком близко, она мяукнет и позовёт сторожа.',
    thPlayer: 'Игрок', thWake: 'Разбудить', thFly: 'Лететь', thEcho: 'Эхолокация',
    click: 'Щелчок', moveMouse: 'Двигать мышью', rightClickOr: 'Правый щелчок или', keySpace: 'Пробел', arrowKeys: 'Стрелки',
    pad: 'Joy-Con / геймпад', anyButton: 'Потряси!', stick: 'Стик', faceButton: 'Любая из четырёх кнопок',
    note: 'Эхолокация посылает звуковые волны к ближайшему к твоей мыши чесноку и отмечает его. Шкала эха над мышью светится, когда эхо снова готово. Подлети к товарищу и нажми «Передать», чтобы отдать ему чеснок. Когда мышь в тюрьме, зрители могут хлопать (или нажимать C), чтобы освободить её быстрее. Потеряешь все 3 жизни — сторож отнесёт мышь в тюрьму (справа внизу) на 20 секунд; товарищи у двери тюрьмы освободят всех быстрее. Мыши, оставшиеся вне замка на рассвете, рассыпаются в прах. Мышь, которая 25 секунд не двигается, снова засыпает.',
    escBack: '— вернуться сюда.',
    roundLength: 'Длина раунда', min3: '3 мин', sec90: '90 сек', sound: 'Звук', on: 'Вкл', off: 'Выкл', language: 'Язык',
    start: 'Начать ночь', loading: 'Загружаем деревню…', orPress: 'или нажми', orPad: 'или любую кнопку контроллера', renderer: 'Графика', preparing: 'Готовим 3D-графику',
    noRenderer: 'Этот браузер не смог запустить 3D-графику. Попробуйте свежую версию Chrome или Edge с включённым аппаратным ускорением.',
    canvasLabel: 'Вампирский чесночный налёт: 3D-деревня ночью',
    winEyebrow: 'Полная победа', caughtEyebrow: 'Все летучие мыши пойманы', sunEyebrow: 'Взошло солнце',
    winTitle: 'Деревня беззащитна!', loseTitle: 'Деревня устояла… пока что',
    winQuote: '«Вы сожгли {n} {bulbs}! Деревня беззащитна… муа-ха-ха!»',
    loseQuote: '«Вы сожгли {n} {bulbs} до рассвета. Следующей ночью деревня падёт!»',
    statBurned: 'Сожжено головок чеснока', statGolden: 'Найдено золотого чеснока', statCaught: 'Раз пойманы светом', statDust: 'Летучих мышей превратилось в пыль',
    newBest: 'Новый рекорд на этом компьютере!', best: 'Рекорд на этом компьютере: сожжено головок — {n}.',
    again: 'Ещё раз', backMenu: 'В меню',
    garlicLeft: 'Осталось чеснока: {n}', burned: 'Сожжено: {n}', sunriseIn: 'Рассвет через {t}', notStarted: 'Ночь ещё не началась',
    hintAsleep: 'Все летучие мыши спят. Щёлкни, нажми WASD, стрелки или потряси Joy-Con, чтобы разбудить одну.',
    hintStart: 'Щёлкни, нажми WASD, стрелки или потряси Joy-Con. Отсчёт до рассвета начнётся с первой летучей мыши.',
    chipEchoReady: 'эхо готово', chipEcho: 'эхо {n} с', chipOut: 'выбыла', chipAsleep: 'спит', chipGarlic: 'с чесноком', livesLabel: 'жизней: {n}',
    tagSleep: 'zzz {name}', tagOut: '{name} · выбыла', tagEchoReady: 'Эхо готово', tagEcho: 'Эхо {n} с',
    bats: ['Курсор', 'Клавиши 1', 'Клавиши 2', 'Геймпад 1', 'Геймпад 2', 'Геймпад 3', 'Геймпад 4'],
    wakeToBegin: 'Разбуди летучую мышь, чтобы начать!', padConnected: 'Контроллер {n} подключён: потряси его, чтобы разбудить летучую мышь',
    yawn: 'зева-а-а~', stealBefore: 'Укради чеснок до рассвета!', moreGarlic: 'Больше летучих мышей — больше добычи: +{n} чеснока!',
    lifeLost: '−1 ♥  (осталось {n})', isOut: '{name} выбывает!', echoReady: 'эхо готово!', hey: 'Эй!', slow: 'ме-е-едленно…', thief: 'Вор!',
    yuck: 'фу!', golden: '+3 золотой!', whoosh: 'вжух! +1', nightShift: 'Ночная смена: ещё один сторож!',
    rooster: 'Кукареку! Назад в замок!', allGone: 'Весь чеснок украден! Держитесь…', mwahaha: 'МУА-ХА-ХА!',
    allCaught: 'Все летучие мыши пойманы!', meow: 'Мяу!', sunPoof: 'Солнце взошло! Пуф…', sunSafe: 'Солнце взошло! Все успели в замок.',
    thPass: 'Передать чеснок', passMouse: 'F или средняя кнопка мыши', passKeys2: 'Правый Shift или /', shoulder: 'Боковая кнопка SL / SR', crowd: 'Хлопки зрителей', micOpt: 'Микрофон', sensitivity: 'Чувствительность', sensLow: 'Низкая', sensMed: 'Средняя', sensHigh: 'Высокая', micStarting: 'Запрашиваем микрофон…', micOn: 'Слушаем. Хлопайте громко, чтобы освободить мышей из тюрьмы!', micDenied: 'Микрофон заблокирован. Разрешите его в адресной строке браузера или используйте клавишу C или кнопку хлопка.', micUnavailable: 'Микрофон не найден. Используйте клавишу C или кнопку хлопка.', clapBtn: 'Хлоп!', clapLabel: 'Шкала хлопков зрителей', clapLeft: 'ещё +{n} с', jarLabel: 'Сожжено {n} из {total} головок чеснока', sunLabel: 'Рассвет через {t}',
    tutTitle: 'Как играть', tut0: 'Лети к чесноку!', tut1: 'Зависни над ним, чтобы схватить', tut2: 'Сожги его в огне замка!', tut3: 'Не попадай в свет фонаря!', tutSkip: 'Нажми любую кнопку, чтобы пропустить', tutorial: 'Обучение', tutGo: 'Вперёд!', starsLabel: '{n} из 3 звёзд',
    style: 'Стиль', stylePainted: 'Рисованный', styleClean: 'Чистый',
    chipCaged: 'в клетке {n} с', tagCaged: 'Клетка {n} с', freeFriend: '{name} в тюрьме! Лети к двери тюрьмы и освободи', jailbreak: 'Побег из тюрьмы!', freed: '{name} на свободе!',
    padCheck: 'Проверка контроллеров', padHint: 'Двигайте каждый стик и нажимайте кнопки: точка и цифры показывают, какой мышью управляет контроллер. Два Joy-Con, объединённые Chrome, видны как левая и правая половины.', padNone: 'не подключён: нажмите кнопку на контроллере', padLeftHalf: 'левый Joy-Con', padRightHalf: 'правый Joy-Con', padRaw: 'Chrome видит геймпадов: {n}:', padHeld: 'Joy-Con держат', padSideways: 'Боком', padUpright: 'Вертикально', padDone: 'Готово',
    padConnect: 'Подключить Joy-Con', padConnectHint: 'Chrome спросит про каждый Joy-Con: выбери один, нажми «Подключить», повтори. Потом они подключаются сами.', padNoHid: 'Этот браузер не может подключить Joy-Con напрямую: используй Chrome и скрипт запуска (не ссылку).', padPro: 'Pro Controller', padLight: 'огонёк {n}', padShaken: 'потрясли!',
    min5: '5 мин', clapJail: 'Хлопайте, чтобы быстрее освободить мышей из тюрьмы!',
    bulbs: ['головку чеснока', 'головки чеснока', 'головок чеснока']
  },
  uk: {
    eyebrow: 'Прототип для тестування · 3D', title1: 'Вампірський ', title2: 'часниковий наліт',
    lede: 'Мешканці села розвісили всюди часник, щоб відлякати вампірів. Але вампіри — це ви! Викрадіть кожну головку й спаліть її в печі замку, поки не зійшло сонце.',
    wakeT: 'Прокинься', wakeD: 'Кожен гравець будить сплячого кажана на стіні замку.',
    grabT: 'Хапай і пали', grabD: 'Повисни над часником 2 секунди, а потім віднеси його до печі. Часник важкий: з ним летиш повільніше. Кожен новий кажан додає 3 головки часнику.',
    watchT: 'Сторожі', watchD: 'Кожен кажан має 3 життя. Потрапив у світло ліхтаря з часником? Втрачаєш життя, губиш головку й засинаєш на кілька секунд. Кожна спалена головка робить сторожів трохи швидшими.',
    lampsT: 'Ліхтарі та кішка', lampsD: 'Вуличні ліхтарі то вмикаються, то гаснуть, і в їхньому світлі кажан летить повільніше. Якщо підлетіти до кішки надто близько, вона нявкне й покличе сторожа.',
    thPlayer: 'Гравець', thWake: 'Розбудити', thFly: 'Летіти', thEcho: 'Ехолокація',
    click: 'Клацання', moveMouse: 'Рухати мишею', rightClickOr: 'Правий клік або', keySpace: 'Пробіл', arrowKeys: 'Стрілки',
    pad: 'Joy-Con / геймпад', anyButton: 'Потруси!', stick: 'Стік', faceButton: 'Будь-яка з чотирьох кнопок',
    note: 'Ехолокація посилає звукові хвилі до найближчого до твого кажана часнику й позначає його. Шкала ехолокації над кажаном світиться, коли вона знову готова. Підлети до товариша й натисни «Передати», щоб віддати йому часник. Коли кажан у в’язниці, глядачі можуть плескати (або натискати C), щоб звільнити його швидше. Втратиш усі 3 життя — сторож віднесе кажана до в’язниці (праворуч унизу) на 20 секунд; товариші біля дверей в’язниці звільнять усіх швидше. Кажани, які на світанку ще поза замком, розсипаються на порох. Кажан, який 25 секунд не рухається, знову засинає.',
    escBack: '— повернутися сюди.',
    roundLength: 'Тривалість раунду', min3: '3 хв', sec90: '90 с', sound: 'Звук', on: 'Увімк.', off: 'Вимк.', language: 'Мова',
    start: 'Почати ніч', loading: 'Завантажуємо село…', orPress: 'або натисни', orPad: 'або будь-яку кнопку контролера', renderer: 'Графіка', preparing: 'Готуємо 3D-графіку',
    noRenderer: 'Цей браузер не зміг запустити 3D-графіку. Спробуйте свіжу версію Chrome або Edge з увімкненим апаратним прискоренням.',
    canvasLabel: 'Вампірський часниковий наліт: 3D-село вночі',
    winEyebrow: 'Повна перемога', caughtEyebrow: 'Усіх кажанів спіймано', sunEyebrow: 'Зійшло сонце',
    winTitle: 'Село беззахисне!', loseTitle: 'Село вистояло… поки що',
    winQuote: '«Ви спалили {n} {bulbs}! Село беззахисне… муа-ха-ха!»',
    loseQuote: '«Ви спалили {n} {bulbs} до світанку. Наступної ночі село впаде!»',
    statBurned: 'Спалено головок часнику', statGolden: 'Знайдено золотого часнику', statCaught: 'Разів спіймано світлом', statDust: 'Кажанів перетворилося на пил',
    newBest: 'Новий рекорд на цьому комп’ютері!', best: 'Рекорд на цьому комп’ютері: спалено головок — {n}.',
    again: 'Ще раз', backMenu: 'До меню',
    garlicLeft: 'Залишилося часнику: {n}', burned: 'Спалено: {n}', sunriseIn: 'Світанок через {t}', notStarted: 'Ніч ще не почалася',
    hintAsleep: 'Усі кажани сплять. Клацни, натисни WASD, стрілки або потруси Joy-Con, щоб розбудити одного.',
    hintStart: 'Клацни, натисни WASD, стрілки або потруси Joy-Con. Відлік до світанку почнеться з першого кажана.',
    chipEchoReady: 'ехо готове', chipEcho: 'ехо {n} с', chipOut: 'вибув', chipAsleep: 'спить', chipGarlic: 'з часником', livesLabel: 'життів: {n}',
    tagSleep: 'zzz {name}', tagOut: '{name} · вибув', tagEchoReady: 'Ехо готове', tagEcho: 'Ехо {n} с',
    bats: ['Миша', 'Клавіші 1', 'Клавіші 2', 'Геймпад 1', 'Геймпад 2', 'Геймпад 3', 'Геймпад 4'],
    wakeToBegin: 'Розбуди кажана, щоб почати!', padConnected: 'Контролер {n} підключено: потруси його, щоб розбудити кажана',
    yawn: 'позі-і-іх~', stealBefore: 'Вкради часник до світанку!', moreGarlic: 'Більше кажанів — більша здобич: +{n} часнику!',
    lifeLost: '−1 ♥  (залишилося {n})', isOut: '{name} вибуває!', echoReady: 'ехо готове!', hey: 'Гей!', slow: 'пові-і-ільно…', thief: 'Злодій!',
    yuck: 'фу!', golden: '+3 золотий!', whoosh: 'вжух! +1', nightShift: 'Нічна зміна: ще один сторож!',
    rooster: 'Кукуріку! Назад до замку!', allGone: 'Увесь часник викрадено! Тримайтеся…', mwahaha: 'МУА-ХА-ХА!',
    allCaught: 'Усіх кажанів спіймано!', meow: 'Няв!', sunPoof: 'Сонце зійшло! Пуф…', sunSafe: 'Сонце зійшло! Усі встигли до замку.',
    thPass: 'Передати часник', passMouse: 'F або середня кнопка миші', passKeys2: 'Правий Shift або /', shoulder: 'Бічна кнопка SL / SR', crowd: 'Оплески глядачів', micOpt: 'Мікрофон', sensitivity: 'Чутливість', sensLow: 'Низька', sensMed: 'Середня', sensHigh: 'Висока', micStarting: 'Запитуємо мікрофон…', micOn: 'Слухаємо. Плескайте гучно, щоб звільнити кажанів із в’язниці!', micDenied: 'Мікрофон заблоковано. Дозвольте його в адресному рядку браузера або використовуйте клавішу C чи кнопку оплесків.', micUnavailable: 'Мікрофон не знайдено. Використовуйте клавішу C або кнопку оплесків.', clapBtn: 'Плесь!', clapLabel: 'Шкала оплесків глядачів', clapLeft: 'ще +{n} с', jarLabel: 'Спалено {n} з {total} головок часнику', sunLabel: 'Світанок через {t}',
    tutTitle: 'Як грати', tut0: 'Лети до часнику!', tut1: 'Зависни над ним, щоб схопити', tut2: 'Спали його у вогні замку!', tut3: 'Не потрапляй у світло ліхтаря!', tutSkip: 'Натисни будь-яку кнопку, щоб пропустити', tutorial: 'Навчання', tutGo: 'Уперед!', starsLabel: '{n} з 3 зірок',
    style: 'Стиль', stylePainted: 'Мальований', styleClean: 'Чистий',
    chipCaged: 'у клітці {n} с', tagCaged: 'Клітка {n} с', freeFriend: '{name} у в’язниці! Лети до дверей в’язниці й звільни', jailbreak: 'Втеча з в’язниці!', freed: '{name} на волі!',
    padCheck: 'Перевірка контролерів', padHint: 'Рухайте кожен стік і натискайте кнопки: крапка й цифри показують, яким кажаном керує контролер. Два Joy-Con, об’єднані Chrome, видно як ліву й праву половини.', padNone: 'не підключено: натисніть кнопку на контролері', padLeftHalf: 'лівий Joy-Con', padRightHalf: 'правий Joy-Con', padRaw: 'Chrome бачить геймпадів: {n}:', padHeld: 'Joy-Con тримають', padSideways: 'Боком', padUpright: 'Вертикально', padDone: 'Готово',
    padConnect: 'Підключити Joy-Con', padConnectHint: 'Chrome спитає про кожен Joy-Con: вибери один, натисни «Підключити», повтори. Потім вони підключаються самі.', padNoHid: 'Цей браузер не може підключити Joy-Con напряму: використовуй Chrome і скрипт запуску (не посилання).', padPro: 'Pro Controller', padLight: 'вогник {n}', padShaken: 'потрусили!',
    min5: '5 хв', clapJail: 'Плескайте, щоб швидше звільнити кажанів із в’язниці!',
    bulbs: ['головку часнику', 'головки часнику', 'головок часнику']
  }
};

const KEY = 'vgh-lang';
let lang = 'en';
try {
  const saved = localStorage.getItem(KEY);
  const nav = (navigator.language || '').slice(0, 2);
  lang = S[saved] ? saved : S[nav] ? nav : 'en';
} catch (e) { /* storage blocked: keep English */ }
const listeners = new Set();

export const getLang = () => lang;
export function setLang(l) {
  if (!S[l]) return;
  lang = l;
  try { localStorage.setItem(KEY, l); } catch (e) { /* storage blocked */ }
  document.documentElement.lang = l;
  listeners.forEach(f => f(l));
}
export const onLang = f => { listeners.add(f); return () => listeners.delete(f); };

// word form for a count: English/Dutch have two, Russian and Ukrainian three (1 головку, 2 головки, 5 головок)
export function plural(key, n) {
  const forms = S[lang][key] || S.en[key];
  if (lang === 'ru' || lang === 'uk') {
    const a = n % 10, b = n % 100;
    return forms[a === 1 && b !== 11 ? 0 : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 1 : 2];
  }
  return forms[n === 1 ? 0 : 1];
}
export function t(key, vars) {
  let s = S[lang][key] ?? S.en[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  return s;
}
export const batName = slot => (S[lang].bats || S.en.bats)[slot];
document.documentElement.lang = lang;
