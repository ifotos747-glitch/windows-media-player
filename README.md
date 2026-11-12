# NOVA MEDIA PLAYER 1.0

Nowoczesny odtwarzacz muzyki i filmów dla Windows, inspirowany wygodą klasycznych odtwarzaczy multimedialnych. To niezależny projekt, nie jest oficjalną aplikacją Microsoft Windows Media Player.

## Funkcje

- Odtwarzanie lokalnej muzyki oraz wideo (obsługa formatów zależy od kodeków dostępnych w Electron/Chromium).
- Otwieranie wielu plików i skanowanie folderów (do 2500 plików na import).
- Przeciąganie i upuszczanie plików do okna.
- Biblioteka: wszystkie media, muzyka, filmy, ulubione, wyszukiwanie.
- Odtwarzanie/pauza, następny/poprzedni, pasek przewijania, głośność, wyciszenie.
- Odtwarzanie losowe, powtarzanie całej listy lub jednego pliku.
- Prędkość 0.75×, 1×, 1.25×, 1.5×, 2×.
- Pełny ekran i obraz w obrazie dla filmów (jeżeli platforma obsługuje PiP).
- Zapisywanie playlisty i ustawień po zamknięciu aplikacji.
- Nie trzeba zakładać konta ani przesyłać plików do internetu.

**Uwaga o formatach:** MP3, WAV, MP4 (H.264/AAC), WebM (VP8/VP9/Opus) to najczęstsze obsługiwane kombinacje. Samo rozszerzenie `.mkv`, `.avi`, `.flac`, `.wma` lub `.wmv` nie oznacza, że kodek będzie działać. Aplikacja pokaże komunikat przy błędzie odtwarzania. Nie używa VLC/FFmpeg jako osobnego dekodera.

## Instalacja i uruchomienie w Windows

1. Zainstaluj **Node.js LTS** z https://nodejs.org (raz na komputerze).
2. Wypakuj ZIP.
3. Kliknij dwa razy `start-windows.bat` (instaluje zależności i uruchamia program).
4. Możesz też uruchomić w PowerShell:

```powershell
npm install
npm start
```

## Tworzenie instalatora EXE i Portable EXE

Na Windows po `npm install` wpisz:

```powershell
npm run check
npm run build:windows
```

Gotowe pliki pojawią się w `dist/`. Pierwszy build wymaga internetu do pobrania Electron i narzędzi pakujących. Instalator nie jest podpisany cyfrowo (Windows SmartScreen może wyświetlać ostrzeżenie).

## Bez kompilacji lokalnej — GitHub Actions

1. Utwórz repozytorium GitHub i wgraj **wszystkie pliki**, włącznie z ukrytym katalogiem `.github/workflows/`.
2. W repozytorium otwórz **Actions** → **Build NOVA MEDIA PLAYER Windows**.
3. Kliknij **Run workflow / Uruchom przepływ pracy**.
4. Po zakończeniu otwórz udany przebieg i pobierz artefakt **NOVA-MEDIA-PLAYER-1.0-WINDOWS**.
5. Wypakuj artefakt — znajdują się tam instalator `.exe` i wersja portable `.exe`.

## Skróty klawiaturowe

| Skrót | Funkcja |
| --- | --- |
| Ctrl + O | Dodaj pliki |
| Ctrl + Shift + O | Dodaj folder |
| Spacja | Odtwarzaj / pauza |
| Strzałki lewo / prawo | -5 / +5 sekund |
| M | Wycisz / włącz dźwięk |
| F | Pełny ekran (wideo) |

## Dane użytkownika

Biblioteka przechowuje ścieżki do plików, a nie kopie muzyki i filmów. Stan jest zapisywany lokalnie w katalogu `userData` Electron (Windows: zwykle `%APPDATA%/nova-media-player/`). Usunięcie pliku z biblioteki **nie usuwa** go z dysku. Nie ma funkcji automatycznego pobierania mediów z internetu.

## Ważne

Źródła aplikacji są gotowe do użycia, ale pliki EXE należy zbudować na Windows lub przez GitHub Actions. Nie testowano odtwarzania poszczególnych kodeków na komputerze użytkownika.
