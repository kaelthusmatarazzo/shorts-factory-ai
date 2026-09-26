// Curated Bank of Verified, Information-Dense Documentary Scripts ("Estilo Você Sabia / Ciência Todo Dia")
// Every script has 6 pure-fact scenes (with real numbers, dates, locations, mechanisms) + Scene 7 Loop Bridge.
// All topics map to real Wikipedia PT/EN articles with rich real photographs on Wikimedia Commons.

const CURATED_DOCUMENTARY_FACTS = [
  {
    topic: 'Ilha da Queimada Grande',
    wikiSearch: 'Ilha da Queimada Grande',
    niche: 'curiosidades',
    title: 'Por Que É Proibido Pisar na Ilha das Cobras no Brasil? 🐍',
    loopStart: '...quase ninguém sabe por que a Marinha do Brasil proíbe qualquer pessoa de pisar na Ilha da Queimada Grande!',
    loopEnd: 'Mas o detalhe mais assustador desse lugar fica claro quando você descobre que...',
    scenes: [
      {
        narration: 'Localizada a apenas 35 quilômetros do litoral de São Paulo, essa ilha brasileira abriga a maior concentração de serpentes mortais do planeta, chegando a cinco cobras altamente venenosas por metro quadrado.',
        imageQuery: 'Ilha da Queimada Grande Bothrops insularis',
        fallbackThemeQuery: 'golden lancehead snake island brazil',
        sceneLabel: '1/7 • Ilha da Queimada Grande (SP)'
      },
      {
        narration: 'Tudo começou há onze mil anos, quando o nível do mar subiu no fim da última Era do Gelo e isolou a montanha do continente, deixando milhares de serpentes presas sem nenhum predador terrestre.',
        imageQuery: 'Ilha da Queimada Grande coast ocean',
        fallbackThemeQuery: 'rocky island ocean brazil',
        sceneLabel: '2/7 • O Isolamento há 11 Mil Anos'
      },
      {
        narration: 'Como não existiam ratos ou mamíferos na ilha, a jararaca-ilhoa evoluiu para caçar aves migratórias no topo das árvores. Só que se a ave voasse após a picada, ela cairia no mar e a cobra morreria de fome.',
        imageQuery: 'Bothrops insularis snake tree',
        fallbackThemeQuery: 'yellow viper snake branch',
        sceneLabel: '3/7 • Evolução Extrema nas Árvores'
      },
      {
        narration: 'Para abater os pássaros em segundos, o veneno dessa espécie ficou cinco vezes mais potente que o de qualquer outra jararaca, sendo capaz de derreter tecidos humanos e causar hemorragia cerebral rapidamente.',
        imageQuery: 'Bothrops insularis venom',
        fallbackThemeQuery: 'viper fangs closeup',
        sceneLabel: '4/7 • Veneno 5x Mais Mortal'
      },
      {
        narration: 'Até a década de 1920, um faroleiro e sua família viviam na ilha para guiar os navios, mas depois que serpentes entraram pelas janelas do farol durante a noite, a Marinha automatizou a torre e evacuou o local.',
        imageQuery: 'Lighthouse island rocky coast',
        fallbackThemeQuery: 'abandoned lighthouse jungle',
        sceneLabel: '5/7 • A Tragédia do Antigo Farol'
      },
      {
        narration: 'Hoje, cerca de quatro mil jararacas-ilhoas dominam a floresta inteira, e apenas biólogos do Instituto Butantan acompanhados por médicos da Marinha têm permissão legal para desembarcar lá.',
        imageQuery: 'Instituto Butantan snake research',
        fallbackThemeQuery: 'scientist snake research',
        sceneLabel: '6/7 • Restrição Militar Absoluta'
      }
    ]
  },
  {
    topic: 'Turritopsis dohrnii',
    wikiSearch: 'Turritopsis dohrnii',
    niche: 'curiosidades',
    title: 'O Único Animal Imortal do Planeta Terra 🪼',
    loopStart: '...existe um animal real nos oceanos que descobriu como enganar a morte e viver para sempre!',
    loopEnd: 'E toda a ciência da longevidade mudou no instante em que biólogos descobriram que...',
    scenes: [
      {
        narration: 'Conhecida pela ciência como Turritopsis dohrnii, essa pequena água-viva transparente do Mar Mediterrâneo mede apenas quatro milímetros, mas é o único ser vivo biologicamente imortal já encontrado na Terra.',
        imageQuery: 'Turritopsis dohrnii jellyfish',
        fallbackThemeQuery: 'transparent glowing jellyfish macro',
        sceneLabel: '1/7 • Turritopsis dohrnii (4mm)'
      },
      {
        narration: 'Quando qualquer outro animal envelhece ou sofre um ferimento grave, suas células param de funcionar e ele morre. Mas com essa água-viva acontece exatamente o oposto no fundo do mar.',
        imageQuery: 'Jellyfish underwater ocean',
        fallbackThemeQuery: 'deep sea jellyfish bioluminescence',
        sceneLabel: '2/7 • O Desafio à Morte Biológica'
      },
      {
        narration: 'Se ela fica velha, passa fome ou a água muda de temperatura, ela aciona um processo raro chamado transdiferenciação celular, onde todas as suas células adultas voltam no tempo como se fossem um bebê.',
        imageQuery: 'Hydrozoa polyp marine biology',
        fallbackThemeQuery: 'microscopic marine cell biology',
        sceneLabel: '3/7 • A Reversão do Envelhecimento'
      },
      {
        narration: 'Em poucos dias, ela encolhe os próprios tentáculos, afunda até encostar em uma rocha submarina e se transforma novamente em um pólipo jovem, exatamente igual ao estágio em que nasceu.',
        imageQuery: 'Coral reef polyp underwater',
        fallbackThemeQuery: 'sea anemone ocean floor',
        sceneLabel: '4/7 • O Retorno ao Estágio de Bebê'
      },
      {
        narration: 'A partir desse único pólipo rejuvenescido, ela começa a produzir centenas de clones idênticos a si mesma com o código genético totalmente restaurado, podendo repetir esse ciclo infinitas vezes.',
        imageQuery: 'Moon jellyfish swarm',
        fallbackThemeQuery: 'jellyfish colony underwater',
        sceneLabel: '5/7 • Clonagem Infinita no Oceano'
      },
      {
        narration: 'Em 2022, geneticistas espanhóis sequenciaram o DNA dessa espécie e descobriram que ela possui o dobro de genes de reparo celular que os humanos, abrindo caminho para futuros tratamentos contra o envelhecimento.',
        imageQuery: 'DNA sequencing laboratory genetics',
        fallbackThemeQuery: 'genetics microscope laboratory',
        sceneLabel: '6/7 • O Segredo no DNA Sequenciado'
      }
    ]
  },
  {
    topic: 'Poço Superprofundo de Kola',
    wikiSearch: 'Poço Superprofundo de Kola',
    niche: 'curiosidades',
    title: 'O Que Encontraram no Buraco Mais Fundo da Terra? 🕳️',
    loopStart: '...o buraco mais profundo já cavado pela humanidade precisou ser lacrado com aço depois do que encontraram lá embaixo!',
    loopEnd: 'Mas o verdadeiro choque dos cientistas aconteceu quando eles perceberam que...',
    scenes: [
      {
        narration: 'Em 1970, cientistas da União Soviética iniciaram o Poço Superprofundo de Kola, próximo à fronteira com a Noruega, com o objetivo de perfurar a crosta terrestre até chegar ao manto do planeta.',
        imageQuery: 'Kola Superdeep Borehole',
        fallbackThemeQuery: 'abandoned soviet drilling rig snow',
        sceneLabel: '1/7 • Poço Superprofundo de Kola'
      },
      {
        narration: 'Durante dezenove anos de escavação contínua, a broca gigante desceu a doze mil duzentos e sessenta e dois metros de profundidade, mais fundo do que o ponto mais abissal da Fossa das Marianas no oceano.',
        imageQuery: 'Kola borehole stamp drilling',
        fallbackThemeQuery: 'deep earth drilling core sample',
        sceneLabel: '2/7 • 12.262 Metros de Profundidade'
      },
      {
        narration: 'A sete quilômetros abaixo dos nossos pés, onde todos os livros de geologia diziam que só existiria granito seco e compacto, as brocas encontraram imensas reservas de água fervente presa sob pressão extrema.',
        imageQuery: 'Granite rock core geology',
        fallbackThemeQuery: 'underground rock cave water',
        sceneLabel: '3/7 • Água Fervente a 7 Km no Subsolo'
      },
      {
        narration: 'Mais surpreendente ainda foi encontrar, a quase sete mil metros de profundidade, vinte e quatro espécies diferentes de microfósseis de plâncton intactos que viveram há mais de dois bilhões de anos.',
        imageQuery: 'Microfossils plankton microscope',
        fallbackThemeQuery: 'fossil microscope ancient life',
        sceneLabel: '4/7 • Fósseis de 2 Bilhões de Anos'
      },
      {
        narration: 'O projeto só parou em 1989 porque a temperatura lá embaixo chegou a cento e oitenta graus Celsius, quase o dobro do previsto. Nessa pressão, a rocha sólida parou de quebrar e começou a derreter como plástico quente.',
        imageQuery: 'Molten rock lava heat geology',
        fallbackThemeQuery: 'magma heat underground rock',
        sceneLabel: '5/7 • Rocha Derretendo a 180 °C'
      },
      {
        narration: 'Toda vez que os engenheiros puxavam a broca para trocar a ponta derretida, o buraco de doze quilômetros se fechava sozinho, até que a instalação foi abandonada e a tampa soldada com doze parafusos de ferro.',
        imageQuery: 'Kola Superdeep Borehole cap',
        fallbackThemeQuery: 'rusted metal hatch industrial',
        sceneLabel: '6/7 • O Poço Soldado para Sempre'
      }
    ]
  },
  {
    topic: 'Cratera de Darvaza',
    wikiSearch: 'Cratera de Darvaza',
    niche: 'curiosidades',
    title: 'O Erro Científico Que Queima Há Mais de 50 Anos 🔥',
    loopStart: '...um erro de cálculo de geólogos no meio do deserto criou uma cratera de fogo que queima sem parar há mais de cinquenta anos!',
    loopEnd: 'E essa história impressionante começou no exato dia em que...',
    scenes: [
      {
        narration: 'No coração do deserto de Karakum, no Turcomenistão, existe uma cratera aberta de setenta metros de largura e trinta metros de profundidade chamada pelos moradores de Porta para o Inferno de Darvaza.',
        imageQuery: 'Darvaza gas crater fire',
        fallbackThemeQuery: 'burning gas crater desert night',
        sceneLabel: '1/7 • A Cratera de Darvaza (70m)'
      },
      {
        narration: 'Ao contrário do que muita gente pensa, ela não é um vulcão natural. Em 1971, engenheiros soviéticos montaram uma torre de perfuração no deserto achando que haviam encontrado um grande campo de petróleo.',
        imageQuery: 'Karakum desert Turkmenistan',
        fallbackThemeQuery: 'desert oil drilling rig vintage',
        sceneLabel: '2/7 • A Perfuração Soviética em 1971'
      },
      {
        narration: 'De repente, o chão arenoso cedeu embaixo do equipamento porque a broca havia perfurado o teto de uma caverna subterrânea gigantesca cheia de gás metano pressurizado, engolindo todo o acampamento.',
        imageQuery: 'Darvaza crater daytime desert',
        fallbackThemeQuery: 'giant sinkhole desert canyon',
        sceneLabel: '3/7 • O Colapso da Caverna de Gás'
      },
      {
        narration: 'Como o gás metano venenoso começou a vazar em alta velocidade e matar os animais das aldeias vizinhas, os cientistas tiveram a ideia de jogar uma granada acesa dentro do buraco para queimar o gás.',
        imageQuery: 'Natural gas flame fire night',
        fallbackThemeQuery: 'fire flames dark desert',
        sceneLabel: '4/7 • A Decisão de Atearem Fogo'
      },
      {
        narration: 'Os geólogos calcularam que todo o bolsão de gás queimaria em apenas duas semanas e depois apagaria sozinho. Só que o reservatório estava conectado a veios subterrâneos imensos sob o deserto.',
        imageQuery: 'Darvaza crater flames closeup',
        fallbackThemeQuery: 'burning pit fire lava',
        sceneLabel: '5/7 • O Cálculo de 2 Semanas vs 50 Anos'
      },
      {
        narration: 'Desde 1971, milhares de chamas a mil graus Celsius continuam rugindo dia e noite dentro do buraco, iluminando o céu do deserto a quilômetros de distância sem nunca ter apagado por um único segundo.',
        imageQuery: 'Door to Hell Turkmenistan night',
        fallbackThemeQuery: 'glowing crater night sky stars',
        sceneLabel: '6/7 • 53 Anos Queimando a 1.000 °C'
      }
    ]
  },
  {
    topic: 'Lago Natron',
    wikiSearch: 'Lago Natron',
    niche: 'curiosidades',
    title: 'O Lago Real Que Transforma Animais em Pedra 🪨',
    loopStart: '...existe um lago vermelho-sangue na África tão cáustico que transforma aves que caem na água em estátuas de pedra!',
    loopEnd: 'Mas o motivo pelo qual nenhum predador consegue entrar nessa água é o fato de que...',
    scenes: [
      {
        narration: 'Localizado no norte da Tanzânia, aos pés do vulcão ativo Ol Doinyo Lengai, o Lago Natron possui águas que chegam a sessenta graus Celsius e uma alcalinidade quase igual à da amônia pura.',
        imageQuery: 'Lake Natron Tanzania red water',
        fallbackThemeQuery: 'red salt lake africa aerial',
        sceneLabel: '1/7 • Lago Natron (Tanzânia)'
      },
      {
        narration: 'O vulcão vizinho é o único do mundo que expele natrocarbonatito, uma lava rica em carbonato de sódio e sal mineral que escorre com as chuvas diretamente para dentro do lago sem saída para o mar.',
        imageQuery: 'Ol Doinyo Lengai volcano Tanzania',
        fallbackThemeQuery: 'active volcano africa landscape',
        sceneLabel: '2/7 • A Lava Química do Vulcão'
      },
      {
        narration: 'Com a evaporação intensa do sol africano, o pH da água sobe para dez vírgula cinco, criando uma crosta química tão corrosiva que queima a pele e os olhos de quase qualquer animal em poucos minutos.',
        imageQuery: 'Salt crust mineral lake',
        fallbackThemeQuery: 'crystallized salt flats red water',
        sceneLabel: '3/7 • Água Alcalina com pH 10,5'
      },
      {
        narration: 'Por causa da superfície lisa como um espelho perfeito, aves migratórias confundem o reflexo do céu com espaço aberto e mergulham direto no lago, morrendo rapidamente com o choque térmico e químico.',
        imageQuery: 'Calcified bird Lake Natron',
        fallbackThemeQuery: 'salt encrusted dead branch shore',
        sceneLabel: '4/7 • O Espelho Mortal para as Aves'
      },
      {
        narration: 'Como a água é saturada do mesmo bicarbonato de sódio que os antigos egípcios usavam para mumificar faraós, os corpos não apodrecem: eles ficam calcificados e preservados na margem como verdadeiras estátuas.',
        imageQuery: 'Egyptian natron salt mineral',
        fallbackThemeQuery: 'petrified stone fossil texture',
        sceneLabel: '5/7 • Mumificação Natural em Pedra'
      },
      {
        narration: 'Incrivelmente, uma única espécie tirou proveito disso: dois milhões e meio de flamingos-pequenos fazem seus ninhos exatamente nas ilhotas de sal do lago, usando a água mortal como escudo contra leões e hienas.',
        imageQuery: 'Lesser flamingos Lake Natron',
        fallbackThemeQuery: 'flock of pink flamingos red lake',
        sceneLabel: '6/7 • O Refúgio de 2,5 Milhões de Flamingos'
      }
    ]
  },
  {
    topic: 'Tardigrada',
    wikiSearch: 'Tardigrada',
    niche: 'curiosidades',
    title: 'O Animal Que Sobreviveu ao Vácuo do Espaço Sem Oxigênio 🌌',
    loopStart: '...cientistas colocaram um animal vivo do lado de fora de um foguete no espaço aberto e ele voltou vivo para a Terra!',
    loopEnd: 'E essa descoberta mudou tudo o que sabemos sobre a vida no universo porque...',
    scenes: [
      {
        narration: 'Chamado de tardígrado ou urso-d’água, esse animal microscópico de oito patas mede apenas meio milímetro e vive escondido em musgos úmidos até mesmo no quintal da sua casa.',
        imageQuery: 'Tardigrade water bear microscope',
        fallbackThemeQuery: 'microscopic tardigrade scanning electron',
        sceneLabel: '1/7 • O Urso-d’Água (0,5 mm)'
      },
      {
        narration: 'Em 2007, a Agência Espacial Europeia lançou três mil tardígrados na missão FOTON-M3 e abriu a cápsula no vácuo absoluto do espaço por dez dias seguidos, sem ar, sem água e sob radiação solar direta.',
        imageQuery: 'Space satellite orbit earth',
        fallbackThemeQuery: 'spacecraft orbit sun radiation',
        sceneLabel: '2/7 • 10 Dias Expostos no Espaço Aberto'
      },
      {
        narration: 'Quando a cápsula pousou de volta na Terra e os biólogos pingaram uma simples gota de água sobre eles, sessenta e oito por cento dos tardígrados acordaram em trinta minutos e ainda colocaram ovos saudáveis!',
        imageQuery: 'Tardigrade moss water droplet',
        fallbackThemeQuery: 'green moss water drop macro',
        sceneLabel: '3/7 • 68% Acordaram Vivos na Terra'
      },
      {
        narration: 'O segredo deles é um estado chamado criptobiose: o tardígrado expulsa noventa e nove por cento de toda a água do próprio corpo, encolhe como um barril seco e desliga completamente o seu metabolismo.',
        imageQuery: 'Tardigrade tun state electron microscope',
        fallbackThemeQuery: 'cell biology microscope structure',
        sceneLabel: '4/7 • O Segredo da Criptobiose (1% Água)'
      },
      {
        narration: 'Para suas células não estourarem com o frio ou o calor, ele fabrica uma proteína única chamada Dsup que envolve o seu DNA como um escudo físico de vidro, suportando de menos 272 até mais 150 graus Celsius.',
        imageQuery: 'DNA protein shield molecular',
        fallbackThemeQuery: 'glowing dna helix protection',
        sceneLabel: '5/7 • O Escudo de Vidro Biológico no DNA'
      },
      {
        narration: 'Eles suportam seis vezes a pressão do fundo das Fossas Marianas e já sobreviveram a todas as cinco grandes extinções em massa da Terra, incluindo o asteroide que dizimou os dinossauros há 66 milhões de anos.',
        imageQuery: 'Asteroid impact earth dinosaur extinction',
        fallbackThemeQuery: 'meteor impact planet earth space',
        sceneLabel: '6/7 • Sobrevivente de 5 Extinções em Massa'
      }
    ]
  },
  {
    topic: 'Kawah Ijen',
    wikiSearch: 'Ijen',
    niche: 'curiosidades',
    title: 'O Único Vulcão da Terra Que Cospe Lava Azul Elétrica 🌋',
    loopStart: '...existe um vulcão ativo na Indonésia onde os rios de fogo que escorrem pela montanha à noite não são vermelhos, mas azul-elétrico!',
    loopEnd: 'Mas o que torna esse fenômeno único no nosso planeta é o fato de que...',
    scenes: [
      {
        narration: 'Durante o dia, o vulcão Kawah Ijen, na ilha de Java na Indonésia, parece apenas uma montanha coberta de fumaça amarela. Mas quando a noite cai, suas encostas brilham com torrentes de fogo azul neon.',
        imageQuery: 'Kawah Ijen blue fire volcano',
        fallbackThemeQuery: 'blue lava flames night volcano',
        sceneLabel: '1/7 • O Fogo Azul de Kawah Ijen'
      },
      {
        narration: 'Esse fenômeno acontece porque a câmara magmática do vulcão expele enormes quantidades de gás sulfúrico puro pelas rachaduras da rocha a uma temperatura extrema de seiscentos graus Celsius.',
        imageQuery: 'Sulfur gas vents volcano Indonesia',
        fallbackThemeQuery: 'volcanic sulfur smoke crater',
        sceneLabel: '2/7 • Gás Sulfúrico a 600 °C'
      },
      {
        narration: 'No exato instante em que esse gás superaquecido entra em contato com o oxigênio do ar externo, ele entra em combustão espontânea, gerando chamas azuis de até cinco metros de altura.',
        imageQuery: 'Blue sulfur flames Kawah Ijen',
        fallbackThemeQuery: 'bright blue fire chemical burn',
        sceneLabel: '3/7 • Chamas Azuis de 5 Metros'
      },
      {
        narration: 'Parte do enxofre queima e condensa de volta ao estado líquido enquanto ainda está pegando fogo, escorrendo montanha abaixo no escuro exatamente como se fosse um rio de lava azul fluorescente.',
        imageQuery: 'Sulfur mining Kawah Ijen Indonesia',
        fallbackThemeQuery: 'yellow sulfur mineral rock volcano',
        sceneLabel: '4/7 • Rios de Enxofre Líquido em Chamas'
      },
      {
        narration: 'No topo dessa mesma cratera ainda existe o maior lago de ácido do planeta, com um quilômetro de largura e água turquesa composta por ácido sulfúrico e clorídrico capaz de dissolver metal.',
        imageQuery: 'Kawah Ijen turquoise acid crater lake',
        fallbackThemeQuery: 'turquoise volcanic crater lake aerial',
        sceneLabel: '5/7 • O Maior Lago de Ácido do Mundo'
      },
      {
        narration: 'Mesmo com a fumaça tóxica, centenas de mineradores locais descem na cratera todas as madrugadas carregando noventa quilos de blocos de enxofre amarelo nas costas para vender às fábricas de açúcar e fósforos.',
        imageQuery: 'Ijen sulfur miners carrying baskets',
        fallbackThemeQuery: 'miner worker carrying sulfur volcano',
        sceneLabel: '6/7 • Os Mineradores da Cratera'
      }
    ]
  },
  {
    topic: 'Caverna dos Cristais',
    wikiSearch: 'Caverna dos Cristais',
    niche: 'curiosidades',
    title: 'A Caverna Mexicana Onde Humanos Só Aguentam 10 Minutos Vivos 💎',
    loopStart: '...a trezentos metros abaixo do deserto do México existe uma caverna real de cristais gigantes onde um ser humano morre se ficar mais de dez minutos!',
    loopEnd: 'E o motivo pelo qual quase ninguém pode entrar lá hoje é que...',
    scenes: [
      {
        narration: 'Em abril do ano 2000, dois irmãos mineradores que perfuravam um túnel de prata em Naica, no México, abriram uma parede de rocha a trezentos metros de profundidade e encontraram os maiores cristais já vistos na Terra.',
        imageQuery: 'Cave of the Crystals Naica Mexico',
        fallbackThemeQuery: 'giant crystal cave underground',
        sceneLabel: '1/7 • A Caverna de Naica (300m)'
      },
      {
        narration: 'Dentro da gruta, pilares translúcidos de selenita atravessam o salão de um lado ao outro como vigas de gelo, chegando a doze metros de comprimento, quatro metros de largura e pesando cinquenta e cinco toneladas cada.',
        imageQuery: 'Giant selenite crystals Naica',
        fallbackThemeQuery: 'quartz crystal formation cave',
        sceneLabel: '2/7 • Cristais de 12 Metros e 55 Toneladas'
      },
      {
        narration: 'Esses cristais gigantes cresceram durante quinhentos mil anos porque a caverna ficava submersa em água subterrânea aquecida a exatos cinquenta e oito graus Celsius por uma câmara de magma logo abaixo.',
        imageQuery: 'Selenite gypsum crystal closeup',
        fallbackThemeQuery: 'white translucent mineral crystal',
        sceneLabel: '3/7 • 500 Mil Anos Crescendo no Magma'
      },
      {
        narration: 'Quando a mineradora bombeou a água para fora, os cientistas descobriram que o ar lá dentro permanece a cinquenta e oito graus com noventa e nove por cento de umidade, uma combinação letal para o corpo humano.',
        imageQuery: 'Scientists cooling suits Naica cave',
        fallbackThemeQuery: 'caver explorer protective suit underground',
        sceneLabel: '4/7 • 58 °C com 99% de Umidade'
      },
      {
        narration: 'Como os nossos pulmões são mais frios que o ar da caverna, a cada respiração o vapor fervente condensa imediatamente dentro dos alvéolos pulmonares, fazendo a pessoa literalmente se afogar no ar em dez minutos.',
        imageQuery: 'Human lungs alveoli medical illustration',
        fallbackThemeQuery: 'steam heat underground cavern',
        sceneLabel: '5/7 • Por Que o Ar Afoga os Pulmões'
      },
      {
        narration: 'Para estudar o local, pesquisadores precisaram usar roupas recheadas de tubos de gelo e respiradores de ar gelado, até que em 2017 a caverna foi inundada de novo para proteger os cristais pelo próximo milênio.',
        imageQuery: 'Underground flooded crystal cavern',
        fallbackThemeQuery: 'underwater cave crystal clear water',
        sceneLabel: '6/7 • Submersa Novamente em 2017'
      }
    ]
  },
  {
    topic: 'Ophiocordyceps unilateralis',
    wikiSearch: 'Ophiocordyceps unilateralis',
    niche: 'curiosidades',
    title: 'O Fungo Real da Amazônia Que Transforma Insetos em Zumbis 🐜',
    loopStart: '...o fungo zumbi da série The Last of Us existe de verdade na Floresta Amazônica e sequestra o corpo de formigas vivas como marionetes!',
    loopEnd: 'Mas o que deixou os cientistas de queixo caído ao usar microscópios 3D foi descobrir que...',
    scenes: [
      {
        narration: 'Chamado de Ophiocordyceps unilateralis, esse fungo parasita real das florestas tropicais brasileiras libera esporos invisíveis que grudam na carapaça da formiga-carpinteira enquanto ela caminha pelo chão.',
        imageQuery: 'Ophiocordyceps unilateralis zombie ant',
        fallbackThemeQuery: 'carpenter ant fungus leaf macro',
        sceneLabel: '1/7 • O Fungo Ophiocordyceps na Amazônia'
      },
      {
        narration: 'Usando enzimas ácidas e pressão mecânica, o esporo fura o exoesqueleto do inseto e começa a se multiplicar na corrente sanguínea durante uma semana, absorvendo os nutrientes dos órgãos internos.',
        imageQuery: 'Cordyceps fungus spores microscope',
        fallbackThemeQuery: 'fungus mycelium macro forest',
        sceneLabel: '2/7 • A Invasão Silenciosa em 7 Dias'
      },
      {
        narration: 'Exames de microscopia mostraram que o fungo não destrói o cérebro da formiga: em vez disso, ele tece uma rede de filamentos ao redor de cada fibra muscular das pernas e da mandíbula, assumindo o controle físico.',
        imageQuery: 'Ant mandible closeup macro',
        fallbackThemeQuery: 'black ant macro leaf rainforest',
        sceneLabel: '3/7 • O Sequestro dos Músculos sem Tocar no Cérebro'
      },
      {
        narration: 'Exatamente ao meio-dia, quando o sol está no ponto mais alto, o fungo força a formiga a abandonar o formigueiro e subir até uma folha localizada a exatos vinte e cinco centímetros acima do solo úmido.',
        imageQuery: 'Rainforest canopy sunlight leaf',
        fallbackThemeQuery: 'tropical rainforest leaf sunlight',
        sceneLabel: '4/7 • A Subida Forçada a Exatos 25 cm'
      },
      {
        narration: 'Lá em cima, ele aplica uma descarga química que trava os músculos da mandíbula da formiga na veia principal da folha com tanta força que ela fica pendurada mesmo depois de morrer.',
        imageQuery: 'Zombie ant biting leaf vein',
        fallbackThemeQuery: 'ant clinging to green leaf stem',
        sceneLabel: '5/7 • A Mordida da Morte na Folha'
      },
      {
        narration: 'Dias depois, uma haste longa brota de trás da cabeça da formiga e explode uma chuva de novos esporos exatamente sobre a trilha onde as outras formigas da colônia estão passando lá embaixo.',
        imageQuery: 'Cordyceps fruiting body ant head',
        fallbackThemeQuery: 'wild cordyceps mushroom forest floor',
        sceneLabel: '6/7 • A Chuva de Esporos Sobre o Formigueiro'
      }
    ]
  },
  {
    topic: 'Relâmpago do Catatumbo',
    wikiSearch: 'Relâmpago do Catatumbo',
    niche: 'curiosidades',
    title: 'O Lugar da Terra Onde Caem 280 Raios Por Hora No Mesmo Ponto ⚡',
    loopStart: '...existe um lago na América do Sul onde uma tempestade elétrica gigante acontece quase todas as noites no exato mesmo lugar há séculos!',
    loopEnd: 'E o motivo pelo qual os navegadores antigos chamavam esse lugar de farol eterno é que...',
    scenes: [
      {
        narration: 'Na foz onde o rio Catatumbo encontra o Lago de Maracaibo, na Venezuela, o céu noturno é iluminado por até duzentos e oitenta relâmpagos por hora durante cento e sessenta noites por ano.',
        imageQuery: 'Catatumbo lightning Venezuela Maracaibo',
        fallbackThemeQuery: 'massive lightning storm night lake',
        sceneLabel: '1/7 • 280 Raios por Hora na Venezuela'
      },
      {
        narration: 'Isso representa mais de um milhão e duzentos mil raios caindo todos os anos na mesma região, um recorde mundial oficial reconhecido pelo Guinness como a maior concentração de relâmpagos da Terra.',
        imageQuery: 'Lightning bolts storm cloud night',
        fallbackThemeQuery: 'multiple lightning strikes purple sky',
        sceneLabel: '2/7 • 1,2 Milhão de Raios por Ano'
      },
      {
        narration: 'Essa máquina de tempestades funciona porque o Lago de Maracaibo é cercado em três lados por muralhas de montanhas da Cordilheira dos Andes que chegam a cinco mil metros de altitude.',
        imageQuery: 'Andes mountains clouds Venezuela',
        fallbackThemeQuery: 'mountain range storm clouds sunset',
        sceneLabel: '3/7 • A Armadilha Geográfica dos Andes'
      },
      {
        narration: 'Durante o dia, o sol tropical evapora milhões de litros de água morna do lago e dos pântanos, que ainda liberam gás metano inflamável vindo de grandes reservas de petróleo no subsolo.',
        imageQuery: 'Lake Maracaibo Venezuela aerial',
        fallbackThemeQuery: 'tropical swamp river sunset',
        sceneLabel: '4/7 • Vapor Quente + Metano do Subsolo'
      },
      {
        narration: 'Quando o sol se põe, o vento gelado que desce do topo dos Andes bate de frente com esse ar quente e úmido preso entre as montanhas, levantando nuvens de doze quilômetros de altura em poucos minutos.',
        imageQuery: 'Cumulonimbus storm cloud anvil',
        fallbackThemeQuery: 'giant thunderhead cloud atmosphere',
        sceneLabel: '5/7 • O Choque Térmico a 12 Km de Altura'
      },
      {
        narration: 'Os clarões contínuos são tão fortes que podem ser vistos a quatrocentos quilômetros de distância e produzem sozinhos cerca de dez por cento de todo o ozônio troposférico gerado pela natureza no planeta.',
        imageQuery: 'Earth atmosphere ozone lightning space',
        fallbackThemeQuery: 'lightning seen from space orbit earth',
        sceneLabel: '6/7 • Visível a 400 Km + Fábrica de Ozônio'
      }
    ]
  },
  {
    topic: 'Pando (árvore)',
    wikiSearch: 'Pando (árvore)',
    niche: 'curiosidades',
    title: 'A Floresta Inteira Que Na Verdade É Uma Única Árvore Viva 🌲',
    loopStart: '...quando você olha para esta floresta de quarenta e sete mil árvores nos Estados Unidos, está vendo na verdade um único ser vivo gigante!',
    loopEnd: 'Mas o segredo que faz essa floresta inteira agir como um só corpo aparece quando...',
    scenes: [
      {
        narration: 'No estado de Utah, nos Estados Unidos, existe um bosque de choupos-trêmulos chamado Pando que cobre quarenta e três hectares, o equivalente a sessenta campos de futebol cheios de árvores.',
        imageQuery: 'Pando tree Utah quaking aspen',
        fallbackThemeQuery: 'golden quaking aspen forest autumn',
        sceneLabel: '1/7 • Pando: 47.000 Troncos em Utah'
      },
      {
        narration: 'Quando geneticistas coletaram folhas de milhares de troncos diferentes, descobriram algo inacreditável: todas as quarenta e sete mil árvores têm exatamente o mesmo DNA porque são brotos de uma única raiz.',
        imageQuery: 'Quaking aspen white bark trunks',
        fallbackThemeQuery: 'white birch aspen tree trunks',
        sceneLabel: '2/7 • O Mesmo DNA em 47 Mil Árvores'
      },
      {
        narration: 'Embaixo da terra, uma rede gigantesca de raízes interligadas bombeia água e nutrientes de uma ponta da floresta para a outra, fazendo de Pando o organismo mais pesado já registrado na história da Terra.',
        imageQuery: 'Tree root system underground forest',
        fallbackThemeQuery: 'massive tree roots forest floor',
        sceneLabel: '3/7 • Uma Única Raiz Subterrânea'
      },
      {
        narration: 'No total, esse único ser vivo pesa seis milhões de quilos, o equivalente a mais de trinta baleias-azuis adultas juntas, superando de longe as maiores sequoias-gigantes da Califórnia.',
        imageQuery: 'Aspen forest aerial autumn gold',
        fallbackThemeQuery: 'vast yellow forest mountains aerial',
        sceneLabel: '4/7 • 6 Milhões de Quilos (30 Baleias-Azuis)'
      },
      {
        narration: 'Enquanto cada tronco individual vive cerca de cento e trinta anos antes de cair e dar lugar a um novo broto da mesma raiz, o sistema subterrâneo de Pando está vivo sem parar há mais de dez mil anos.',
        imageQuery: 'Ancient forest mountain snow',
        fallbackThemeQuery: 'snowy aspen forest winter',
        sceneLabel: '5/7 • Mais de 10.000 Anos de Idade'
      },
      {
        narration: 'A prova visual disso aparece na primavera e no outono: como a floresta inteira compartilha o mesmo relógio genético, todas as quarenta e sete mil copas mudam de cor para o amarelo-ouro no exato mesmo dia.',
        imageQuery: 'Golden aspen leaves autumn',
        fallbackThemeQuery: 'bright yellow autumn leaves sunlight',
        sceneLabel: '6/7 • Mudança de Cor no Exato Mesmo Dia'
      }
    ]
  },
  {
    topic: 'Mecanismo de Anticítera',
    wikiSearch: 'Mecanismo de Anticítera',
    niche: 'historia',
    title: 'O Computador de Bronze de 2.100 Anos Encontrado no Fundo do Mar ⚙️',
    loopStart: '...mergulhadores encontraram nos destroços de um navio romano um computador de engrenagens de bronze construído dois mil anos antes de Cristo!',
    loopEnd: 'E os historiadores só entenderam como esse aparelho era impossível para a época quando...',
    scenes: [
      {
        narration: 'No ano de 1901, pescadores de esponjas que mergulhavam a quarenta e cinco metros de profundidade perto da ilha grega de Anticítera encontraram um naufrágio antigo cheio de estátuas de mármore e moedas.',
        imageQuery: 'Antikythera Mechanism bronze',
        fallbackThemeQuery: 'ancient greek artifact museum',
        sceneLabel: '1/7 • O Naufrágio de Anticítera (1901)'
      },
      {
        narration: 'No meio dos tesouros havia um bloco de bronze corroído do tamanho de uma caixa de sapatos que se partiu ao secar, revelando dezenas de rodas dentadas milimétricas esculpidas há dois mil e cem anos.',
        imageQuery: 'Antikythera mechanism gear fragment',
        fallbackThemeQuery: 'ancient bronze gears clockwork',
        sceneLabel: '2/7 • Engrenagens de 2.100 Anos Atrás'
      },
      {
        narration: 'Durante décadas ninguém acreditou que os gregos antigos tivessem aquela tecnologia, até que cientistas passaram o artefato por um tomógrafo de raios X em três dimensões de alta resolução.',
        imageQuery: 'X-ray tomography Antikythera gears',
        fallbackThemeQuery: 'x-ray scan mechanical gears',
        sceneLabel: '3/7 • A Revelação no Raio-X 3D'
      },
      {
        narration: 'O exame revelou trinta e sete engrenagens de bronze com dentes triangulares de apenas um milímetro, conectadas a uma manivela lateral onde o usuário girava para escolher qualquer data no futuro ou no passado.',
        imageQuery: 'Antikythera mechanism reconstruction model',
        fallbackThemeQuery: 'brass astronomical clock gears',
        sceneLabel: '4/7 • 37 Engrenagens de Precisão Milimétrica'
      },
      {
        narration: 'Ao girar a manivela, os ponteiros calculavam simultaneamente a posição exata do Sol, da Lua e de cinco planetas, além de prever o dia e a hora de eclipses solares e lunares com décadas de antecedência!',
        imageQuery: 'Solar eclipse astronomy ancient',
        fallbackThemeQuery: 'solar eclipse moon shadow space',
        sceneLabel: '5/7 • Previsão Exata de Eclipses e Planetas'
      },
      {
        narration: 'Depois que esse navio afundou por volta do ano setenta antes de Cristo, o conhecimento para fabricar engrenagens diferenciais desapareceu da história e a humanidade levou mil e quinhentos anos para criar algo parecido.',
        imageQuery: 'National Archaeological Museum Athens Antikythera',
        fallbackThemeQuery: 'ancient shipwreck underwater amphora',
        sceneLabel: '6/7 • Tecnologia Perdida por 1.500 Anos'
      }
    ]
  },
  {
    topic: 'Manuscrito Voynich',
    wikiSearch: 'Manuscrito Voynich',
    niche: 'misterios',
    title: 'O Livro de 600 Anos Que Nem a Inteligência Artificial Conseguiu Ler 📖',
    loopStart: '...existe um livro ilustrado de seiscentos anos trancado na Universidade de Yale escrito em um idioma que nenhum ser humano ou supercomputador conseguiu decifrar!',
    loopEnd: 'Mas o detalhe que prova que esse livro não é uma simples brincadeira aparece quando...',
    scenes: [
      {
        narration: 'Encontrado em 1912 pelo livreiro Wilfrid Voynich em um antigo colégio jesuíta na Itália, o Manuscrito Voynich possui duzentas e quarenta páginas de pergaminho escritas à mão sem um único erro ou rasura.',
        imageQuery: 'Voynich manuscript pages',
        fallbackThemeQuery: 'medieval illuminated manuscript book',
        sceneLabel: '1/7 • O Manuscrito Voynich (240 Páginas)'
      },
      {
        narration: 'Em 2009, físicos da Universidade do Arizona fizeram o teste de carbono quatorze no couro das páginas e comprovaram que o livro foi fabricado entre os anos de 1404 e 1438, no início do século quinze.',
        imageQuery: 'Voynich manuscript botanical illustration',
        fallbackThemeQuery: 'ancient parchment ink writing',
        sceneLabel: '2/7 • Datado por Carbono-14 (1404–1438)'
      },
      {
        narration: 'O grande mistério é que as trinta e oito mil palavras do livro usam um alfabeto desconhecido de vinte e poucos símbolos que não pertence a nenhuma língua humana já registrada na Terra.',
        imageQuery: 'Voynich manuscript text script',
        fallbackThemeQuery: 'mysterious cipher symbols ancient code',
        sceneLabel: '3/7 • 38.000 Palavras em Alfabeto Desconhecido'
      },
      {
        narration: 'Mais estranhas ainda são as ilustrações coloridas: a seção de botânica mostra mais de cem plantas detalhadas com raízes e flores que simplesmente não correspondem a nenhuma espécie conhecida na natureza.',
        imageQuery: 'Voynich manuscript plants',
        fallbackThemeQuery: 'strange botanical drawing medieval',
        sceneLabel: '4/7 • Plantas Que Não Existem na Terra'
      },
      {
        narration: 'Outras páginas dobráveis trazem mapas astronômicos de constelações inexistentes e diagramas biológicos de mulheres imersas em redes de tubos verdes que parecem vasos sanguíneos ou células.',
        imageQuery: 'Voynich manuscript astronomical diagram',
        fallbackThemeQuery: 'medieval zodiac star chart',
        sceneLabel: '5/7 • Mapas Astrais e Tubos Biológicos'
      },
      {
        narration: 'Criptógrafos militares que quebraram os códigos da Segunda Guerra Mundial e algoritmos modernos tentaram traduzi-lo, descobrindo que o texto segue a Lei matemática de Zipf, o que só acontece em idiomas reais.',
        imageQuery: 'Beinecke Rare Book Library Yale',
        fallbackThemeQuery: 'rare book library vault',
        sceneLabel: '6/7 • A Lei de Zipf: É um Idioma Real'
      }
    ]
  },
  {
    topic: 'Cachoeira de Sangue',
    wikiSearch: 'Blood Falls',
    niche: 'curiosidades',
    title: 'Por Que Existe Uma Cachoeira Vermelho-Sangue na Antártida? 🩸',
    loopStart: '...no meio do gelo completamente branco da Antártida existe uma cachoeira real que jorra água vermelho-sangue diretamente para o mar congelado!',
    loopEnd: 'E o mistério de como essa água não congela a vinte graus negativos foi resolvido quando...',
    scenes: [
      {
        narration: 'Descoberta em 1911 pelo geólogo australiano Griffith Taylor nos Vales Secos da Antártida, a chamada Cachoeira de Sangue despeja um líquido vermelho intenso que mancha a frente da Geleira Taylor.',
        imageQuery: 'Blood Falls Antarctica Taylor Glacier',
        fallbackThemeQuery: 'antarctica glacier ice cliff',
        sceneLabel: '1/7 • A Cachoeira de Sangue na Antártida'
      },
      {
        narration: 'Durante quase cem anos os cientistas acharam que a cor vermelha vinha de algas microscópicas, até que radares de penetração no gelo revelaram a verdadeira origem a quatrocentos metros de profundidade.',
        imageQuery: 'Taylor Glacier Dry Valleys Antarctica',
        fallbackThemeQuery: 'white glacier valley antarctica',
        sceneLabel: '2/7 • O Radar a 400 Metros Sob o Gelo'
      },
      {
        narration: 'Há cerca de dois milhões de anos, a geleira avançou e selou um antigo lago marinho por baixo de quatrocentos metros de gelo sólido, isolando aquela água da luz do sol e do oxigênio da atmosfera.',
        imageQuery: 'Subglacial lake ice sheet radar',
        fallbackThemeQuery: 'deep blue glacier ice cave',
        sceneLabel: '3/7 • Lago Selado Há 2 Milhões de Anos'
      },
      {
        narration: 'Como a água presa lá embaixo ficou três vezes mais salgada do que o oceano, ela não congela mesmo quando a temperatura ao redor cai para dezessete graus negativos.',
        imageQuery: 'Sea ice brine Antarctica',
        fallbackThemeQuery: 'frozen ocean ice crystals',
        sceneLabel: '4/7 • Água 3x Mais Salgada Que o Mar'
      },
      {
        narration: 'Raspando a rocha do fundo por milhões de anos, essa salmoura ficou carregada de ferro dissolvido. No exato segundo em que a água escapa por uma fenda e toca o oxigênio do ar, o ferro enferruja instantaneamente, ficando vermelho-sangue!',
        imageQuery: 'Iron oxide red water mineral',
        fallbackThemeQuery: 'rust red mineral water flow',
        sceneLabel: '5/7 • O Ferro Que Enferruja ao Tocar o Ar'
      },
      {
        narration: 'E o mais incrível: dentro desse lago escuro e sem oxigênio, biólogos encontraram colônias de bactérias vivas que se alimentam de ferro e enxofre há dois milhões de anos, provando como pode existir vida subterrânea em Marte.',
        imageQuery: 'Extremophile bacteria microscope',
        fallbackThemeQuery: 'mars ice cap space nasa',
        sceneLabel: '6/7 • Vida Sem Luz e Sem Oxigênio'
      }
    ]
  },
  {
    topic: 'Psychrolutes marcidus',
    wikiSearch: 'Psychrolutes marcidus',
    niche: 'curiosidades',
    title: 'A Verdade Que Nunca Te Contaram Sobre o Peixe Mais Feio do Mundo 🐟',
    loopStart: '...aquela foto famosa do peixe-bolha rosa e derretido que todo mundo chama de animal mais feio do mundo na verdade esconde uma história muito triste!',
    loopEnd: 'Mas você só entende por que ele fica com aquele rosto irreconhecível quando descobre que...',
    scenes: [
      {
        narration: 'Eleito em 2013 como o animal mais feio do planeta, o peixe-bolha vive nas águas escuras e geladas da costa da Austrália e da Tasmânia, a uma profundidade de até mil e duzentos metros.',
        imageQuery: 'Psychrolutes marcidus blobfish',
        fallbackThemeQuery: 'deep sea fish underwater dark',
        sceneLabel: '1/7 • O Peixe-Bolha a 1.200 Metros'
      },
      {
        narration: 'Lá no fundo do oceano, onde a pressão da água é cento e vinte vezes maior do que na superfície da Terra, o peixe-bolha não é rosa, não é gelatinoso e tem o formato normal de um peixe comum!',
        imageQuery: 'Deep ocean abyssal zone fish',
        fallbackThemeQuery: 'deep sea ocean floor pressure',
        sceneLabel: '2/7 • Como Ele Realmente É no Fundo do Mar'
      },
      {
        narration: 'Para conseguir nadar sob uma pressão esmagadora que estouraria a bexiga natatória cheia de gás de qualquer peixe comum, o peixe-bolha evoluiu sem ossos pesados e sem músculos densos.',
        imageQuery: 'Deep sea creature bioluminescence',
        fallbackThemeQuery: 'deep underwater marine life',
        sceneLabel: '3/7 • O Corpo Feito para 120 Atmosferas'
      },
      {
        narration: 'Em vez de esqueleto rígido, o corpo dele é composto por uma massa gelatinosa levemente menos densa que a água, mantida firme no formato certo exclusivamente pela força da pressão do oceano ao redor.',
        imageQuery: 'Deep sea exploration submarine',
        fallbackThemeQuery: 'submarine headlights deep ocean',
        sceneLabel: '4/7 • Sustentado Pela Pressão Externa'
      },
      {
        narration: 'O problema acontece quando redes de pesca comercial de arrasto capturam o peixe lá no fundo e o puxam rapidamente para a superfície, fazendo a pressão cair cento e vinte vezes em poucos minutos.',
        imageQuery: 'Fishing trawler net ocean',
        fallbackThemeQuery: 'commercial fishing boat sea',
        sceneLabel: '5/7 • A Descompressão Brutal nas Redes'
      },
      {
        narration: 'Sem a pressão da água para segurar sua estrutura, seus tecidos se expandem, os vasos sanguíneos estouram e o corpo desaba por completo. Seria exatamente como julgar a aparência de um humano jogado no vácuo sem traje espacial.',
        imageQuery: 'Tasmania deep sea coast ocean',
        fallbackThemeQuery: 'southern ocean waves australia',
        sceneLabel: '6/7 • O Efeito da Falta de Pressão'
      }
    ]
  },
  {
    topic: 'Netuno (planeta)',
    wikiSearch: 'Netuno (planeta)',
    niche: 'futuro',
    title: 'O Planeta Real Onde Chovem Milhões de Toneladas de Diamantes 💎',
    loopStart: '...a quatro bilhões e meio de quilômetros da Terra existe um planeta real do nosso Sistema Solar onde literalmente chovem diamantes puros do céu!',
    loopEnd: 'E os físicos conseguiram provar em laboratório como isso acontece quando descobriram que...',
    scenes: [
      {
        narration: 'Dentro dos gigantes gelados Netuno e Urano, os ventos mais rápidos do Sistema Solar sopram a dois mil e cem quilômetros por hora sobre uma atmosfera carregada de gás metano.',
        imageQuery: 'Neptune planet Voyager 2 NASA',
        fallbackThemeQuery: 'planet neptune blue space nasa',
        sceneLabel: '1/7 • Netuno e Ventos de 2.100 km/h'
      },
      {
        narration: 'O metano é formado por átomos de carbono ligados ao hidrogênio. À medida que você desce sete mil quilômetros para dentro da atmosfera de Netuno, o calor sobe para quatro mil e setecentos graus Celsius.',
        imageQuery: 'Uranus and Neptune atmosphere NASA',
        fallbackThemeQuery: 'blue gas giant planet rings space',
        sceneLabel: '2/7 • 7.000 Km de Profundidade a 4.700 °C'
      },
      {
        narration: 'Nessa profundidade, o peso da atmosfera cria uma pressão seis milhões de vezes maior do que a pressão do ar na Terra, suficiente para quebrar as moléculas de metano ao meio e liberar carbono puro.',
        imageQuery: 'Carbon atom diamond structure',
        fallbackThemeQuery: 'molecular crystal lattice science',
        sceneLabel: '3/7 • Pressão de 6 Milhões de Atmosferas'
      },
      {
        narration: 'Comprimidos por essa força colossal, os átomos de carbono são esmagados instantaneamente na estrutura cristalina mais dura do universo, formando milhões de diamantes sólidos em plena queda livre.',
        imageQuery: 'Rough uncut diamonds mineral',
        fallbackThemeQuery: 'sparkling raw diamond crystal',
        sceneLabel: '4/7 • A Formação da Chuva de Diamantes'
      },
      {
        narration: 'Em 2017, físicos da Universidade de Stanford usaram o laser de raios X mais potente do mundo para recriar a pressão interna de Netuno e viram nanodiamantes se formando diante das câmeras em frações de segundo!',
        imageQuery: 'SLAC National Accelerator Laboratory laser',
        fallbackThemeQuery: 'high power laser physics laboratory',
        sceneLabel: '5/7 • Comprovado em Laboratório com Laser'
      },
      {
        narration: 'Segundo os cálculos astrofísicos, os maiores diamantes chegam a pesar milhões de quilates e afundam como granizo brilhante até formar uma camada inteira de diamante ao redor do núcleo rochoso do planeta.',
        imageQuery: 'Deep space planetary core illustration',
        fallbackThemeQuery: 'glowing planet core cosmos',
        sceneLabel: '6/7 • Um Oceano de Diamantes no Núcleo'
      }
    ]
  },
  {
    topic: 'Cérebro de Albert Einstein',
    wikiSearch: 'Cérebro de Albert Einstein',
    niche: 'historia',
    title: 'A Bizarra História do Homem Que Roubou o Cérebro de Einstein 🧠',
    loopStart: '...quando Albert Einstein morreu em 1955, ele deixou ordens expressas para que seu corpo fosse inteiramente cremado, mas o médico da autópsia roubou o cérebro dele em segredo!',
    loopEnd: 'E o que os neurocientistas finalmente encontraram ao analisar os blocos no microscópio mostrou que...',
    scenes: [
      {
        narration: 'Na madrugada de 18 de abril de 1955, o físico Albert Einstein faleceu aos setenta e seis anos no Hospital de Princeton. Ele havia pedido para ser cremado em segredo para que ninguém idolatrasse seus restos mortais.',
        imageQuery: 'Albert Einstein 1947 portrait',
        fallbackThemeQuery: 'albert einstein chalkboard physics',
        sceneLabel: '1/7 • A Morte de Einstein em 1955'
      },
      {
        narration: 'Porém, o patologista de plantão, doutor Thomas Stoltz Harvey, abriu o crânio durante a autópsia, removeu o cérebro de Einstein sem permissão da família e o escondeu dentro de um pote de vidro com formol.',
        imageQuery: 'Princeton Hospital historical photo',
        fallbackThemeQuery: 'vintage medical laboratory jars',
        sceneLabel: '2/7 • O Roubo Secreto na Autópsia'
      },
      {
        narration: 'Quando o roubo foi descoberto dias depois, Harvey foi demitido do hospital, mas convenceu o filho de Einstein a deixá-lo ficar com o órgão prometendo que o estudaria apenas para o avanço da ciência.',
        imageQuery: 'Albert Einstein lecturing',
        fallbackThemeQuery: 'vintage scientist microscope lab',
        sceneLabel: '3/7 • A Demissão e o Acordo com a Família'
      },
      {
        narration: 'Harvey fotografou o cérebro de dezenas de ângulos, mediu seu peso em mil duzentos e trinta gramas — um pouco menor que a média humana — e o fatiou em duzentos e quarenta pequenos blocos numerados.',
        imageQuery: 'Human brain anatomy medical',
        fallbackThemeQuery: 'brain scan neurology research',
        sceneLabel: '4/7 • Fatiado em 240 Blocos Numerados'
      },
      {
        narration: 'Durante quarenta anos, o médico guardou os potes dentro de uma caixa de cidra debaixo de um refrigerador enquanto se mudava pelo interior dos Estados Unidos, enviando lâminas pelo correio para neurologistas.',
        imageQuery: 'Microscope glass slides laboratory',
        fallbackThemeQuery: 'histology microscope slides medical',
        sceneLabel: '5/7 • 40 Anos Escondido em uma Caixa'
      },
      {
        narration: 'Os estudos revelaram que o lobo parietal inferior de Einstein, exatamente a região responsável pelo raciocínio matemático e visão espacial em três dimensões, era quinze por cento mais largo que o de uma pessoa comum!',
        imageQuery: 'Muetter Museum Philadelphia Einstein brain',
        fallbackThemeQuery: 'neuroscience brain neuron synapses',
        sceneLabel: '6/7 • O Lobo Parietal 15% Maior'
      }
    ]
  },
  {
    topic: 'Salar de Uyuni',
    wikiSearch: 'Salar de Uyuni',
    niche: 'curiosidades',
    title: 'O Deserto na Bolívia Que Vira o Maior Espelho do Planeta Terra 🪞',
    loopStart: '...a três mil seiscentos e cinquenta metros de altitude nos Andes existe um deserto branco tão plano que quando chove se transforma no maior espelho natural do planeta Terra!',
    loopEnd: 'Mas o verdadeiro tesouro trilhardário escondido debaixo desse chão branco é o fato de que...',
    scenes: [
      {
        narration: 'Localizado no sudoeste da Bolívia, o Salar de Uyuni cobre dez mil quinhentos e oitenta e dois quilômetros quadrados de sal puro, uma área maior do que todo o território de países como o Líbano ou a Jamaica.',
        imageQuery: 'Salar de Uyuni Bolivia mirror',
        fallbackThemeQuery: 'salt flats reflection sky bolivia',
        sceneLabel: '1/7 • Salar de Uyuni (10.582 km²)'
      },
      {
        narration: 'Há quarenta mil anos, toda aquela região era ocupada por um lago pré-histórico gigante chamado Lago Minchin. Quando o clima mudou e a água evaporou sem ter saída para o mar, restaram dez bilhões de toneladas de sal.',
        imageQuery: 'Salar de Uyuni hexagonal salt crust',
        fallbackThemeQuery: 'hexagonal salt desert patterns',
        sceneLabel: '2/7 • 10 Bilhões de Toneladas de Sal'
      },
      {
        narration: 'Por causa da formação geológica da crosta, a superfície inteira de mais de dez mil quilômetros quadrados tem uma variação de altura de menos de um metro de uma ponta à outra.',
        imageQuery: 'Isla Incahuasi Salar de Uyuni cacti',
        fallbackThemeQuery: 'giant cactus island salt desert',
        sceneLabel: '3/7 • Desnível Menor Que 1 Metro'
      },
      {
        narration: 'Entre janeiro e março, uma fina lâmina de água da chuva fica parada sobre essa crosta nivelada, apagando a linha do horizonte e refletindo as nuvens e as estrelas com perfeição absoluta.',
        imageQuery: 'Salar de Uyuni night stars reflection',
        fallbackThemeQuery: 'milky way reflection water mirror',
        sceneLabel: '4/7 • O Horizonte Onde a Terra Vira Céu'
      },
      {
        narration: 'Essa superfície é tão plana e reflexiva que os satélites da NASA e da Agência Espacial Europeia em órbita apontam seus lasers para o Salar de Uyuni para calibrar seus altímetros com cinco vezes mais precisão que no oceano!',
        imageQuery: 'Earth observation satellite orbit space',
        fallbackThemeQuery: 'satellite orbiting earth space',
        sceneLabel: '5/7 • Usado pela NASA para Calibrar Satélites'
      },
      {
        narration: 'E debaixo da camada de sal corre uma salmoura que guarda cerca de nove milhões de toneladas de lítio, uma das maiores reservas do planeta do metal essencial para fabricar baterias de celulares e carros elétricos.',
        imageQuery: 'Lithium evaporation ponds Bolivia',
        fallbackThemeQuery: 'turquoise lithium salt pools aerial',
        sceneLabel: '6/7 • 9 Milhões de Toneladas de Lítio'
      }
    ]
  },
  {
    topic: 'Fossa das Marianas',
    wikiSearch: 'Fossa das Marianas',
    niche: 'curiosidades',
    title: 'O Que Realmente Existe a 11.000 Metros no Ponto Mais Fundo do Oceano? 🌊',
    loopStart: '...se você colocasse a montanha inteira do Monte Everest dentro do ponto mais fundo do oceano, o pico dela ainda ficaria coberto por mais de dois quilômetros de água!',
    loopEnd: 'E o choque maior dos exploradores que desceram até o fundo absoluto foi ver que...',
    scenes: [
      {
        narration: 'Localizada no Oceano Pacífico, a leste das Ilhas Marianas, a Fossa das Marianas é uma cicatriz em forma de meia-lua na crosta terrestre que desce até dez mil novecentos e oitenta e quatro metros no abismo Challenger Deep.',
        imageQuery: 'Mariana Trench Challenger Deep map',
        fallbackThemeQuery: 'deep ocean trench bathymetry',
        sceneLabel: '1/7 • Challenger Deep (10.984 Metros)'
      },
      {
        narration: 'A luz do sol desaparece completamente após os primeiros duzentos metros de descida. A partir de um quilômetro, a escuridão é total e a água permanece a apenas um grau acima do congelamento.',
        imageQuery: 'Deep sea bathyscaphe Trieste',
        fallbackThemeQuery: 'deep sea submersible dark ocean',
        sceneLabel: '2/7 • Escuridão Total a 1 °C'
      },
      {
        narration: 'Lá no fundo, o peso da coluna de onze quilômetros de água exerce uma pressão de mil e oitenta e seis atmosferas, o equivalente a ter o peso de cinquenta aviões Boeing Jumbo pressionando cada centímetro do seu corpo.',
        imageQuery: 'Deepsea Challenger James Cameron submarine',
        fallbackThemeQuery: 'submarine exploration abyssal',
        sceneLabel: '3/7 • 1.086 Atmosferas de Pressão'
      },
      {
        narration: 'Mesmo nesse ambiente extremo, expedições descobriram o peixe-caracol das Marianas nadando a oito mil metros e anfípodes translúcidos que sobrevivem alimentando-se de detritos marinhos e minerais.',
        imageQuery: 'Mariana snailfish deep sea',
        fallbackThemeQuery: 'translucent deep sea amphipod',
        sceneLabel: '4/7 • Vida Real a 8.000 Metros'
      },
      {
        narration: 'No fundo da fossa também existem os chamados xenofióforos, organismos unicelulares gigantes que atingem dez centímetros de diâmetro apenas absorvendo chumbo, urânio e mercúrio do sedimento.',
        imageQuery: 'Hydrothermal vent deep ocean floor',
        fallbackThemeQuery: 'underwater black smoker hydrothermal vent',
        sceneLabel: '5/7 • Cenas de Chaminés Hidrotermais'
      },
      {
        narration: 'Tristemente, quando o explorador Victor Vescovo desceu a dez mil novecentos e vinte e sete metros em 2019, a primeira coisa que seus holofotes iluminaram no ponto mais isolado da Terra foi uma sacola plástica e embalagens de doce.',
        imageQuery: 'Limiting Factor submersible ocean',
        fallbackThemeQuery: 'deep ocean floor exploration camera',
        sceneLabel: '6/7 • Plástico Humano a 10.927 Metros'
      }
    ]
  },
  {
    topic: 'Tsingy de Bemaraha',
    wikiSearch: 'Reserva Natural Integral do Tsingy de Bemaraha',
    niche: 'curiosidades',
    title: 'A Floresta de Facas de Pedra de 100 Metros Onde Ninguém Consegue Andar 🗡️',
    loopStart: '...na ilha de Madagascar existe uma floresta inteira feita de torres de pedra afiadas como lâminas de bisturi onde um único tropeço é fatal!',
    loopEnd: 'Mas o que torna esse labirinto de lâminas um santuário biológico único no mundo é que...',
    scenes: [
      {
        narration: 'Conhecida como Tsingy de Bemaraha, essa formação de seiscentos e sessenta e seis quilômetros quadrados recebe um nome no idioma malgaxe que significa literalmente o lugar onde não se pode caminhar descalço.',
        imageQuery: 'Tsingy de Bemaraha Madagascar rock needles',
        fallbackThemeQuery: 'sharp limestone pinnacles madagascar',
        sceneLabel: '1/7 • Tsingy de Bemaraha (Madagascar)'
      },
      {
        narration: 'Há duzentos milhões de anos, toda essa região ficava no fundo de uma lagoa tropical rasa, acumulando uma camada espessa de conchas marinhas e esqueletos de corais que se transformaram em rocha calcária.',
        imageQuery: 'Limestone karst pinnacles Madagascar',
        fallbackThemeQuery: 'jagged stone forest canyon',
        sceneLabel: '2/7 • Fundo do Mar Há 200 Milhões de Anos'
      },
      {
        narration: 'Quando as placas tectônicas levantaram a rocha para fora do mar, milhões de anos de chuvas tropicais levemente ácidas dissolveram o calcário de cima para baixo, esculpindo agulhas verticais de até cem metros de altura.',
        imageQuery: 'Tsingy de Bemaraha suspension bridge',
        fallbackThemeQuery: 'rope bridge over sharp rock canyon',
        sceneLabel: '3/7 • Agulhas de Rocha de 100 Metros'
      },
      {
        narration: 'As bordas superiores dessas torres de calcário são tão finas e cortantes que rasgam botas de couro, cordas de alpinismo e equipamentos metálicos com a mesma facilidade de uma lâmina de aço.',
        imageQuery: 'Decken sifaka lemur Tsingy Madagascar',
        fallbackThemeQuery: 'white lemur jumping on rocks',
        sceneLabel: '4/7 • Lâminas Que Cortam Couro e Cordas'
      },
      {
        narration: 'Incrivelmente, o lêmure-branco-de-Decken evoluiu almofadas grossas e elásticas nas mãos e nos pés que funcionam como pneus de borracha, permitindo que ele salte de faca em faca a dez metros de altura sem sofrer um arranhão!',
        imageQuery: 'White sifaka lemur Madagascar',
        fallbackThemeQuery: 'sifaka lemur madagascar wildlife',
        sceneLabel: '5/7 • O Lêmure Que Salta Sobre Facas'
      },
      {
        narration: 'Na base escura e úmida entre as agulhas, onde nenhum humano consegue descer, cientistas descobriram dezenas de espécies inéditas de plantas, sapos e morcegos que não existem em nenhum outro metro quadrado da Terra.',
        imageQuery: 'Tsingy canyon forest below',
        fallbackThemeQuery: 'hidden jungle canyon cliffs',
        sceneLabel: '6/7 • Um Mundo Secreto Entre as Lâminas'
      }
    ]
  },
  {
    topic: 'Ilha Sentinela do Norte',
    wikiSearch: 'Ilha Sentinela do Norte',
    niche: 'curiosidades',
    title: 'A Ilha Proibida Onde o Povo Vive na Idade da Pedra em Pleno 2026 🏹',
    loopStart: '...no meio do Oceano Índico existe uma ilha cercada por navios da Marinha onde qualquer pessoa que tente desembarcar é recebida com flechas de dois metros!',
    loopEnd: 'Mas o motivo pelo qual o mundo inteiro decidiu nunca mais pisar nessa praia é o fato de que...',
    scenes: [
      {
        narration: 'Pertencente ao arquipélago de Andamão, na Índia, a Ilha Sentinela do Norte tem o tamanho de Manhattan e abriga os sentineleses, a tribo mais isolada do planeta Terra há sessenta mil anos.',
        imageQuery: 'North Sentinel Island Andaman aerial',
        fallbackThemeQuery: 'tropical island coral reef aerial',
        sceneLabel: '1/7 • Ilha Sentinela do Norte (60.000 Anos)'
      },
      {
        narration: 'Eles não conhecem a agricultura, o plástico nem como acender fogo do zero: eles guardam brasas acesas de raios que caem nas árvores e usam pedaços de ferro de navios naufragados para afiar a ponta das flechas.',
        imageQuery: 'Andaman islands tropical beach jungle',
        fallbackThemeQuery: 'dense tropical jungle beach',
        sceneLabel: '2/7 • Vida sem Fogo Artificial e Metalurgia'
      },
      {
        narration: 'Em 1981, o navio cargueiro Primrose encalhou nos corais da ilha. Durante uma semana, os marinheiros ficaram presos no convés vendo dezenas de guerreiros construindo barcos de madeira na praia até serem salvos de helicóptero.',
        imageQuery: 'Shipwreck coral reef island',
        fallbackThemeQuery: 'rusted shipwreck tropical reef',
        sceneLabel: '3/7 • O Naufrágio do Cargueiro Primrose'
      },
      {
        narration: 'Quando o megatsunami de 2004 devastou o Oceano Índico, o governo indiano enviou um helicóptero achando que todos tinham morrido, mas um guerreiro correu para a areia e disparou flechas direto contra a aeronave!',
        imageQuery: 'Indian Navy coast guard helicopter',
        fallbackThemeQuery: 'rescue helicopter flying over ocean',
        sceneLabel: '4/7 • Sobreviventes ao Tsunami de 2004'
      },
      {
        narration: 'Os cientistas descobriram que a tribo pressentiu a chegada do tsunami horas antes dos sensores modernos porque observaram o comportamento dos animais e o recuo repentino do mar, subindo para o topo das colinas.',
        imageQuery: 'Coral reef low tide tropical island',
        fallbackThemeQuery: 'ocean waves coral reef island',
        sceneLabel: '5/7 • O Alerta Natural Antes do Tsunami'
      },
      {
        narration: 'Hoje existe uma zona militar de exclusão de nove quilômetros ao redor da ilha, tanto para proteger os visitantes quanto porque um simples vírus de gripe comum mataria toda a tribo por falta de anticorpos.',
        imageQuery: 'Bay of Bengal ocean sunset',
        fallbackThemeQuery: 'indian ocean patrol boat sunset',
        sceneLabel: '6/7 • Zona de Exclusão de 9 Km'
      }
    ]
  },
  {
    topic: 'Pata de Elefante (Chernobyl)',
    wikiSearch: 'Pata de Elefante (Chernobyl)',
    niche: 'curiosidades',
    title: 'O Objeto Mais Perigoso da Terra Que Mata em 5 Minutos ☢️',
    loopStart: '...no porão escuro debaixo da usina de Chernobyl existe uma massa sólida de duas toneladas tão radioativa que até os robôs enviados para fotografá-la pifaram na hora!',
    loopEnd: 'E o jeito que os soldados encontraram para tirar uma amostra daquela rocha foi...',
    scenes: [
      {
        narration: 'Em dezembro de 1986, oito meses após a explosão do reator quatro de Chernobyl, cientistas soviéticos desceram aos corredores inundados do subsolo e encontraram uma massa enrugada de dois metros apelidada de Pata de Elefante.',
        imageQuery: 'Chernobyl Nuclear Power Plant sarcophagus',
        fallbackThemeQuery: 'chernobyl reactor 4 abandoned',
        sceneLabel: '1/7 • A Pata de Elefante em Chernobyl'
      },
      {
        narration: 'Durante o acidente, o núcleo nuclear chegou a dois mil e seiscentos graus Celsius, derretendo o combustível de urânio junto com toneladas de aço, areia e concreto do piso, criando uma lava artificial chamada cório.',
        imageQuery: 'Chernobyl control room reactor',
        fallbackThemeQuery: 'abandoned nuclear control room soviet',
        sceneLabel: '2/7 • O Cório Derretido a 2.600 °C'
      },
      {
        narration: 'Quando os técnicos empurraram um sensor preso em uma roda até a sala, o medidor registrou dez mil roentgens por hora, o equivalente a receber o raio X de quatro milhões e meio de chapas de tórax de uma só vez!',
        imageQuery: 'Geiger counter radiation dosimeter',
        fallbackThemeQuery: 'radiation geiger counter warning',
        sceneLabel: '3/7 • 10.000 Roentgens por Hora'
      },
      {
        narration: 'Nessa intensidade, ficar apenas trinta segundos perto da Pata de Elefante causava tontura e febre; dois minutos estouravam as células do sangue, e cinco minutos no mesmo corredor significavam morte garantida em dois dias.',
        imageQuery: 'Pripyat abandoned city Chernobyl',
        fallbackThemeQuery: 'abandoned pripyat ferris wheel',
        sceneLabel: '4/7 • Letal em Apenas 300 Segundos'
      },
      {
        narration: 'Para fotografar a massa sem entrar na sala, os engenheiros montaram espelhos no corredor. A radiação era tão forte que atravessava a lente e deixava as fotos cheias de faíscas brancas e granuladas.',
        imageQuery: 'Chernobyl New Safe Confinement arch',
        fallbackThemeQuery: 'giant steel containment dome',
        sceneLabel: '5/7 • Fotos Queimadas pela Radiação'
      },
      {
        narration: 'Como nenhuma broca elétrica funcionava perto dela, a única forma de arrancar um pedaço para análise foi chamar um atirador de elite com um fuzil Kalashnikov blindado para atirar na borda da rocha a distância!',
        imageQuery: 'Radioactive mineral sample laboratory',
        fallbackThemeQuery: 'nuclear laboratory lead shield',
        sceneLabel: '6/7 • Amostra Coletada a Tiros de Fuzil'
      }
    ]
  },
  {
    topic: 'Exército de Terracota',
    wikiSearch: 'Exército de Terracota',
    niche: 'historia',
    title: 'Por Que o Governo da China Tem Medo de Abrir a Tumba do Primeiro Imperador? 🏺',
    loopStart: '...camponeses que cavavam um poço de água na China encontraram oito mil soldados de barro em tamanho real guardando uma pirâmide subterrânea que ninguém teve coragem de abrir até hoje!',
    loopEnd: 'Mas o verdadeiro motivo pelo qual os arqueólogos proibiram abrir a porta central é que...',
    scenes: [
      {
        narration: 'Em março de 1974, agricultores da província de Shaanxi cavaram apenas dois metros de terra para buscar água e deram de cara com o Exército de Terracota do primeiro imperador da China, Qin Shi Huang.',
        imageQuery: 'Terracotta Army Xian China warriors',
        fallbackThemeQuery: 'terracotta warriors pit xian china',
        sceneLabel: '1/7 • Os 8.000 Guerreiros de Xian (1974)'
      },
      {
        narration: 'Ao escavarem as fossas ao redor, os arqueólogos desenterraram oito mil soldados, cento e trinta carruagens e seiscentos cavalos esculpidos há mais de dois mil e duzentos anos para proteger o imperador após a morte.',
        imageQuery: 'Terracotta Army horses chariots',
        fallbackThemeQuery: 'ancient chinese terracotta horse',
        sceneLabel: '2/7 • 2.200 Anos Debaixo da Terra'
      },
      {
        narration: 'O detalhe mais impressionante é que nenhuma das oito mil estátuas é igual à outra: cada soldado possui rosto, bigode, orelhas, penteado e expressão facial únicos, modelados a partir de guerreiros reais da época!',
        imageQuery: 'Terracotta warrior face closeup',
        fallbackThemeQuery: 'terracotta soldier head detail',
        sceneLabel: '3/7 • 8.000 Rostos 100% Diferentes'
      },
      {
        narration: 'Porém, esses oito mil soldados são apenas a guarda externa. A um quilômetro dali fica uma colina piramidal intacta onde está selado o palácio subterrâneo com o caixão do imperador há vinte e dois séculos.',
        imageQuery: 'Mausoleum of the First Qin Emperor mound',
        fallbackThemeQuery: 'pyramid hill xian china trees',
        sceneLabel: '4/7 • A Pirâmide Intocada do Imperador'
      },
      {
        narration: 'Segundo os textos antigos do historiador Sima Qian, setecentos mil trabalhadores construíram dentro da tumba bestas mecânicas armadas para disparar flechas automáticas e rios inteiros cheios de mercúrio líquido venenoso!',
        imageQuery: 'Liquid mercury metal droplets',
        fallbackThemeQuery: 'silver liquid mercury metal',
        sceneLabel: '5/7 • Rios de Mercúrio Líquido e Armadilhas'
      },
      {
        narration: 'Quando cientistas modernos mediram o solo da colina sem cavar, encontraram concentrações de mercúrio cem vezes maiores que o normal, provando que os rios tóxicos realmente estão lá dentro esperando há dois mil anos.',
        imageQuery: 'Terracotta Army museum pit 1',
        fallbackThemeQuery: 'archaeological excavation museum china',
        sceneLabel: '6/7 • Mercúrio 100x Acima do Normal Confirmado'
      }
    ]
  }
];

// High-impact real Wikipedia PT-BR articles (NO obscure taxonomy stubs) for infinite deep harvesting
const HIGH_IMPACT_WIKI_TOPICS = {
  curiosidades: [
    'Ilha da Queimada Grande', 'Turritopsis dohrnii', 'Poço Superprofundo de Kola', 'Cratera de Darvaza',
    'Lago Natron', 'Tardigrada', 'Ijen', 'Caverna dos Cristais', 'Ophiocordyceps unilateralis',
    'Relâmpago do Catatumbo', 'Pando (árvore)', 'Salar de Uyuni', 'Fossa das Marianas',
    'Reserva Natural Integral do Tsingy de Bemaraha', 'Ilha Sentinela do Norte', 'Pata de Elefante (Chernobyl)',
    'Lago Karachay', 'Rafflesia arnoldii', 'Vantablack', 'Aerogel', 'Peixe-pescador',
    'Lula-colossal', 'Camarão-louva-a-deus', 'Vespa-mandarina', 'Dragão-de-komodo',
    'Ornitorrinco', 'Axolote', 'Quimera (peixe)', 'Sequoiadendron giganteum',
    'Welwitschia mirabilis', 'Lago Baikal', 'Mar Morto', 'Depressão de Danakil',
    'Monte Roraima', 'Olho do Saara', 'Caverna de Son Doong', 'Rio fervente',
    'Aurora polar', 'Raio globular', 'Fogo-de-santelmo', 'Bioluminescência'
  ],
  misterios: [
    'Manuscrito Voynich', 'Incidente da Passagem Dyatlov', 'Mary Celeste', 'Sinal Wow!',
    'Triângulo das Bermudas', 'Linhas de Nazca', 'Ilha de Páscoa', 'Göbekli Tepe',
    'Pedra de Roseta', 'Esferas de pedra da Costa Rica', 'Monólitos de Pumapunku',
    'Cidade Perdida de Z', 'Atlântida', 'Experimento Filadélfia', 'Caso Varginha',
    'Operação Prato', 'Luzes de Hessdalen', 'Bloop', 'Colônia de Roanoke'
  ],
  historia: [
    'Mecanismo de Anticítera', 'Cérebro de Albert Einstein', 'Exército de Terracota',
    'Biblioteca de Alexandria', 'Pompeia', 'Fogo grego', 'Aço damasco',
    'Tumba de Tutancâmon', 'Machu Picchu', 'Grande Muralha da China',
    'Coliseu', 'Pirâmide de Quéops', ' Navio Vasa', 'Peste Negra', 'Guerra dos Emus'
  ],
  futuro: [
    'Netuno (planeta)', 'Telescópio Espacial James Webb', 'Voyager 1', 'Buraco negro supermassivo',
    'Estrela de nêutrons', 'Exoplaneta', 'Titã (satélite)', 'Europa (satélite)',
    'Esfera de Dyson', 'Paradoxo de Fermi', 'Viagem interestelar', 'Fusão nuclear',
    'Computador quântico', 'CRISPR'
  ],
  motivacao: [
    'Marco Aurélio', 'Sêneca', 'Epicteto', 'Viktor Frankl', 'Miyamoto Musashi',
    'Efeito Dunning-Kruger', 'Experimento do marshmallow', 'Neuroplasticidade'
  ],
  financas: [
    'Tulipomania', 'Mansa Musa', 'Companhia Holandesa das Índias Orientais',
    'Hiperinflação na República de Weimar', 'Reserva de Ouro de Fort Knox',
    'Bitcoin', 'Juros compostos'
  ]
};

module.exports = { CURATED_DOCUMENTARY_FACTS, HIGH_IMPACT_WIKI_TOPICS };

