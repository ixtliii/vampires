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
    watchT: 'Watchmen', watchD: 'Each bat has 3 lives. Getting caught in a lantern’s light while carrying garlic costs a life and makes you drop it. Fly close with garlic and they chase you.',
    lampsT: 'Lamps & the cat', lampsD: 'Street lamps switch on and off; their light slows your bat down. The cat meows if you fly too close, calling a watchman over.',
    thPlayer: 'Player', thWake: 'Wake up', thFly: 'Fly', thEcho: 'Echolocate',
    click: 'Click', moveMouse: 'Move the mouse', rightClickOr: 'Right-click or', keySpace: 'Space', arrowKeys: 'Arrow keys',
    pad: 'Joy-Con / gamepad', anyButton: 'Any button', stick: 'Stick', faceButton: 'Any face button',
    note: 'Echolocation sends sound waves to the garlic closest to your bat and marks it with an arrow (sometimes a hidden golden one, worth 3). The echo meter above your bat fills up and glows when you can use it again. Lose all 3 lives and your bat is out for the night. Bats still outside the castle at sunrise turn to dust. A bat that sits still for 25 seconds goes back to sleep.',
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
    hintAsleep: 'All bats are asleep. Click, press WASD or arrows, or a controller button to wake one.',
    hintStart: 'Click, press WASD or arrows, or a controller button. The sunrise timer starts with the first bat.',
    chipEchoReady: 'echo ready', chipEcho: 'echo {n}s', chipOut: 'out', chipAsleep: 'asleep', chipGarlic: 'garlic', livesLabel: '{n} lives',
    tagSleep: 'zzz {name}', tagOut: '{name} · out', tagEchoReady: 'Echo ready', tagEcho: 'Echo {n}s',
    bats: ['Mouse', 'Keys 1', 'Keys 2', 'Pad 1', 'Pad 2', 'Pad 3', 'Pad 4'],
    wakeToBegin: 'Wake up a bat to begin!', padConnected: 'Controller {n} connected: press a button to wake a bat',
    yawn: 'yaaawn~', stealBefore: 'Steal the garlic before sunrise!', moreGarlic: 'More bats, bigger heist: +{n} garlic!',
    lifeLost: '−1 ♥  ({n} left)', isOut: '{name} is out!', echoReady: 'echo ready!', hey: 'Hey!', slow: 'slooow…', thief: 'Thief!',
    yuck: 'yuck!', golden: '+3 golden!', whoosh: 'whoosh! +1', nightShift: 'The night shift starts: another watchman!',
    rooster: 'Cock-a-doodle-doo! Back to the castle!', allGone: 'All the garlic is gone! Hold on…', mwahaha: 'MWAHAHA!',
    allCaught: 'Every bat got caught!', meow: 'Meow!', sunPoof: 'The sun is up! Poof…', sunSafe: 'The sun is up! Everyone made it to the castle.',
    bulbs: ['garlic bulb', 'garlic bulbs']
  },
  nl: {
    eyebrow: 'Speeltest-prototype · 3D', title1: 'Vampier ', title2: 'Knoflookroof',
    lede: 'Het dorp heeft overal knoflook opgehangen om vampiers buiten te houden. Maar jullie zijn de vampiers! Steel elke bol en verbrand hem in de oven van het kasteel voordat de zon opkomt.',
    wakeT: 'Wakker worden', wakeD: 'Elke speler maakt een slapende vleermuis op de kasteelmuur wakker.',
    grabT: 'Pakken & verbranden', grabD: 'Hang 2 seconden boven een knoflook en vlieg hem dan naar de oven. Knoflook is zwaar: je vliegt trager. Elke extra vleermuis brengt 3 knoflookbollen meer.',
    watchT: 'Nachtwakers', watchD: 'Elke vleermuis heeft 3 levens. Word je met knoflook in het licht van een lantaarn betrapt, dan verlies je een leven en laat je de knoflook vallen. Vlieg je met knoflook te dichtbij, dan zitten ze je achterna.',
    lampsT: 'Lantaarns & de kat', lampsD: 'Straatlantaarns gaan aan en uit; in hun licht vliegt je vleermuis trager. De kat miauwt als je te dichtbij vliegt en roept zo een nachtwaker.',
    thPlayer: 'Speler', thWake: 'Wakker maken', thFly: 'Vliegen', thEcho: 'Echolocatie',
    click: 'Klikken', moveMouse: 'Beweeg de muis', rightClickOr: 'Rechtsklik of', keySpace: 'Spatie', arrowKeys: 'Pijltjestoetsen',
    pad: 'Joy-Con / gamepad', anyButton: 'Elke knop', stick: 'Stick', faceButton: 'Een van de vier knoppen',
    note: 'Echolocatie stuurt geluidsgolven naar de knoflook die het dichtst bij je vleermuis is en zet er een pijl boven (soms is het een verstopte gouden, die 3 punten waard is). De echometer boven je vleermuis loopt vol en gloeit zodra je hem weer kunt gebruiken. Ben je alle 3 levens kwijt, dan ligt je vleermuis eruit voor de rest van de nacht. Vleermuizen die bij zonsopgang nog buiten het kasteel zijn, vergaan tot stof. Een vleermuis die 25 seconden stilzit, valt weer in slaap.',
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
    hintAsleep: 'Alle vleermuizen slapen. Klik, druk op WASD of de pijltjes, of op een knop van een controller om er een wakker te maken.',
    hintStart: 'Klik, druk op WASD of de pijltjes, of op een knop van een controller. De tijd tot zonsopgang begint te lopen bij de eerste vleermuis.',
    chipEchoReady: 'echo klaar', chipEcho: 'echo {n}s', chipOut: 'eruit', chipAsleep: 'slaapt', chipGarlic: 'knoflook', livesLabel: '{n} levens',
    tagSleep: 'zzz {name}', tagOut: '{name} · eruit', tagEchoReady: 'Echo klaar', tagEcho: 'Echo {n}s',
    bats: ['Muis', 'Toetsen 1', 'Toetsen 2', 'Pad 1', 'Pad 2', 'Pad 3', 'Pad 4'],
    wakeToBegin: 'Maak een vleermuis wakker om te beginnen!', padConnected: 'Controller {n} verbonden: druk op een knop om een vleermuis wakker te maken',
    yawn: 'geeeeuw~', stealBefore: 'Steel de knoflook voor zonsopgang!', moreGarlic: 'Meer vleermuizen, grotere roof: +{n} knoflook!',
    lifeLost: '−1 ♥  (nog {n})', isOut: '{name} ligt eruit!', echoReady: 'echo klaar!', hey: 'Hé!', slow: 'traaaag…', thief: 'Dief!',
    yuck: 'bah!', golden: '+3 goud!', whoosh: 'woesj! +1', nightShift: 'De nachtploeg begint: nog een nachtwaker!',
    rooster: 'Kukeleku! Terug naar het kasteel!', allGone: 'Alle knoflook is weg! Even volhouden…', mwahaha: 'MWAHAHA!',
    allCaught: 'Alle vleermuizen zijn betrapt!', meow: 'Miauw!', sunPoof: 'De zon is op! Poef…', sunSafe: 'De zon is op! Iedereen is veilig in het kasteel.',
    bulbs: ['knoflookbol', 'knoflookbollen']
  },
  ru: {
    eyebrow: 'Прототип для тестирования · 3D', title1: 'Вампирский ', title2: 'чесночный налёт',
    lede: 'Жители деревни развесили повсюду чеснок, чтобы отпугнуть вампиров. Но вампиры — это вы! Украдите каждую головку и сожгите её в печи замка, пока не взошло солнце.',
    wakeT: 'Проснись', wakeD: 'Каждый игрок будит спящую летучую мышь на стене замка.',
    grabT: 'Хватай и сжигай', grabD: 'Повисни над чесноком 2 секунды, а потом отнеси его в печь. Чеснок тяжёлый: с ним летишь медленнее. Каждая новая летучая мышь добавляет 3 головки чеснока.',
    watchT: 'Сторожа', watchD: 'У каждой летучей мыши 3 жизни. Если с чесноком попадёшь в свет фонаря сторожа, ты теряешь жизнь и роняешь чеснок. Подлетишь к сторожу с чесноком — он погонится за тобой.',
    lampsT: 'Фонари и кошка', lampsD: 'Уличные фонари то включаются, то гаснут, и в их свете летучая мышь летит медленнее. Если подлететь к кошке слишком близко, она мяукнет и позовёт сторожа.',
    thPlayer: 'Игрок', thWake: 'Разбудить', thFly: 'Лететь', thEcho: 'Эхолокация',
    click: 'Щелчок', moveMouse: 'Двигать мышью', rightClickOr: 'Правый щелчок или', keySpace: 'Пробел', arrowKeys: 'Стрелки',
    pad: 'Joy-Con / геймпад', anyButton: 'Любая кнопка', stick: 'Стик', faceButton: 'Любая из четырёх кнопок',
    note: 'Эхолокация посылает звуковые волны к ближайшему чесноку и отмечает его стрелкой (иногда это спрятанный золотой — он стоит 3). Шкала эха над летучей мышью заполняется и светится, когда эхо снова готово. Потеряешь все 3 жизни — летучая мышь выбывает до конца ночи. Летучие мыши, которые на рассвете ещё не в замке, превращаются в пыль. Если 25 секунд ничего не делать, летучая мышь снова засыпает.',
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
    hintAsleep: 'Все летучие мыши спят. Щёлкни, нажми WASD, стрелки или кнопку контроллера, чтобы разбудить одну.',
    hintStart: 'Щёлкни, нажми WASD, стрелки или кнопку контроллера. Отсчёт до рассвета начнётся с первой летучей мыши.',
    chipEchoReady: 'эхо готово', chipEcho: 'эхо {n} с', chipOut: 'выбыла', chipAsleep: 'спит', chipGarlic: 'с чесноком', livesLabel: 'жизней: {n}',
    tagSleep: 'zzz {name}', tagOut: '{name} · выбыла', tagEchoReady: 'Эхо готово', tagEcho: 'Эхо {n} с',
    bats: ['Курсор', 'Клавиши 1', 'Клавиши 2', 'Геймпад 1', 'Геймпад 2', 'Геймпад 3', 'Геймпад 4'],
    wakeToBegin: 'Разбуди летучую мышь, чтобы начать!', padConnected: 'Контроллер {n} подключён: нажми кнопку, чтобы разбудить летучую мышь',
    yawn: 'зева-а-а~', stealBefore: 'Укради чеснок до рассвета!', moreGarlic: 'Больше летучих мышей — больше добычи: +{n} чеснока!',
    lifeLost: '−1 ♥  (осталось {n})', isOut: '{name} выбывает!', echoReady: 'эхо готово!', hey: 'Эй!', slow: 'ме-е-едленно…', thief: 'Вор!',
    yuck: 'фу!', golden: '+3 золотой!', whoosh: 'вжух! +1', nightShift: 'Ночная смена: ещё один сторож!',
    rooster: 'Кукареку! Назад в замок!', allGone: 'Весь чеснок украден! Держитесь…', mwahaha: 'МУА-ХА-ХА!',
    allCaught: 'Все летучие мыши пойманы!', meow: 'Мяу!', sunPoof: 'Солнце взошло! Пуф…', sunSafe: 'Солнце взошло! Все успели в замок.',
    bulbs: ['головку чеснока', 'головки чеснока', 'головок чеснока']
  },
  uk: {
    eyebrow: 'Прототип для тестування · 3D', title1: 'Вампірський ', title2: 'часниковий наліт',
    lede: 'Мешканці села розвісили всюди часник, щоб відлякати вампірів. Але вампіри — це ви! Викрадіть кожну головку й спаліть її в печі замку, поки не зійшло сонце.',
    wakeT: 'Прокинься', wakeD: 'Кожен гравець будить сплячого кажана на стіні замку.',
    grabT: 'Хапай і пали', grabD: 'Повисни над часником 2 секунди, а потім віднеси його до печі. Часник важкий: з ним летиш повільніше. Кожен новий кажан додає 3 головки часнику.',
    watchT: 'Сторожі', watchD: 'Кожен кажан має 3 життя. Якщо з часником потрапиш у світло ліхтаря сторожа, втрачаєш життя й упускаєш часник. Підлетиш до сторожа з часником — він поженеться за тобою.',
    lampsT: 'Ліхтарі та кішка', lampsD: 'Вуличні ліхтарі то вмикаються, то гаснуть, і в їхньому світлі кажан летить повільніше. Якщо підлетіти до кішки надто близько, вона нявкне й покличе сторожа.',
    thPlayer: 'Гравець', thWake: 'Розбудити', thFly: 'Летіти', thEcho: 'Ехолокація',
    click: 'Клацання', moveMouse: 'Рухати мишею', rightClickOr: 'Правий клік або', keySpace: 'Пробіл', arrowKeys: 'Стрілки',
    pad: 'Joy-Con / геймпад', anyButton: 'Будь-яка кнопка', stick: 'Стік', faceButton: 'Будь-яка з чотирьох кнопок',
    note: 'Ехолокація посилає звукові хвилі до найближчого часнику й позначає його стрілкою (іноді це схований золотий — він вартий 3). Шкала ехо над кажаном заповнюється й світиться, коли ехо знову готове. Втратиш усі 3 життя — кажан вибуває до кінця ночі. Кажани, які на світанку ще не в замку, перетворюються на пил. Якщо 25 секунд нічого не робити, кажан знову засинає.',
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
    hintAsleep: 'Усі кажани сплять. Клацни, натисни WASD, стрілки або кнопку контролера, щоб розбудити одного.',
    hintStart: 'Клацни, натисни WASD, стрілки або кнопку контролера. Відлік до світанку почнеться з першого кажана.',
    chipEchoReady: 'ехо готове', chipEcho: 'ехо {n} с', chipOut: 'вибув', chipAsleep: 'спить', chipGarlic: 'з часником', livesLabel: 'життів: {n}',
    tagSleep: 'zzz {name}', tagOut: '{name} · вибув', tagEchoReady: 'Ехо готове', tagEcho: 'Ехо {n} с',
    bats: ['Миша', 'Клавіші 1', 'Клавіші 2', 'Геймпад 1', 'Геймпад 2', 'Геймпад 3', 'Геймпад 4'],
    wakeToBegin: 'Розбуди кажана, щоб почати!', padConnected: 'Контролер {n} підключено: натисни кнопку, щоб розбудити кажана',
    yawn: 'позі-і-іх~', stealBefore: 'Вкради часник до світанку!', moreGarlic: 'Більше кажанів — більша здобич: +{n} часнику!',
    lifeLost: '−1 ♥  (залишилося {n})', isOut: '{name} вибуває!', echoReady: 'ехо готове!', hey: 'Гей!', slow: 'пові-і-ільно…', thief: 'Злодій!',
    yuck: 'фу!', golden: '+3 золотий!', whoosh: 'вжух! +1', nightShift: 'Нічна зміна: ще один сторож!',
    rooster: 'Кукуріку! Назад до замку!', allGone: 'Увесь часник викрадено! Тримайтеся…', mwahaha: 'МУА-ХА-ХА!',
    allCaught: 'Усіх кажанів спіймано!', meow: 'Няв!', sunPoof: 'Сонце зійшло! Пуф…', sunSafe: 'Сонце зійшло! Усі встигли до замку.',
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
