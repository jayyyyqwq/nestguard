# NestGuard hardware guide

A step-by-step guide to building a NestGuard sensor box, connecting it to your laptop, and
putting it in a beehive, chicken coop or animal shelter. No electronics experience needed. If
you can plug in a phone charger and follow a recipe, you can do this.

Plan about **2 hours for your first box**. The second and third boxes take about 30 minutes each.

---

## How it all works

```
  ENCLOSURE                         YOUR HOME WI-FI                YOUR LAPTOP
 ┌───────────────┐                                              ┌──────────────────┐
 │ Sensor box    │   sends readings every 30 seconds            │ NestGuard        │
 │ (ESP32 +      │ ───────────── over Wi-Fi ──────────────────▶ │ (run.bat/run.sh) │
 │  4 sensors)   │                                              │                  │
 └───────────────┘                                              │ Dashboard at     │
   powered by a USB phone charger                               │ localhost:3000   │
                                                                └──────────────────┘
```

- The **sensor box** measures temperature, humidity, air quality, light and sound.
- Every 30 seconds it sends the numbers to **your laptop** over your normal home Wi-Fi.
- Your laptop runs **NestGuard** (`run.bat` on Windows, `run.sh` on a Mac). It stores the
  readings, shows them on the dashboard, and raises an alert when something goes out of the safe
  range.
- The ESP32 itself also needs a small program on it, which tells it to read the sensors and send
  the numbers. You copy that program onto the board once, from the laptop, with the free Arduino
  IDE (Part 3 and Part 5). The full program is printed at the end of this guide.
- Nothing goes to the internet. No account, no cloud, no monthly fee.

**It's plug and play.** You never type an address or a Wi-Fi password into the code:

- The first time a box is powered on a Wi-Fi it doesn't know, it creates its own little Wi-Fi
  called `NestGuard-COOP1` (or HIVE1 / SHED1). You join it from your phone, pick your Wi-Fi, type
  the password, done. It remembers it.
- The box then finds **whichever laptop is running NestGuard** on that Wi-Fi by itself. Your
  laptop or your friend's: both work, nothing to change on the box.

### Do I need any other app?

| Where | What you need | When |
|---|---|---|
| Every laptop that shows the dashboard (yours, your friend's) | **NestGuard**: Windows `setup.bat` once, then `run.bat`. Mac: `setup.sh` once, then `run.sh` | Always, to see the dashboard |
| The laptop you build the boxes on | **Arduino IDE** (free, Windows or Mac) | Only once per box, to load the program onto it. Your friend doesn't need it |
| The laptop you build the boxes on | A USB driver (free, maybe) | Only if the laptop doesn't recognise the board, see Step 4 |
| Phone | **Nothing to install.** Just its Wi-Fi settings and browser | To give a box your Wi-Fi password (Step 12), and optionally to view the dashboard |

---

## Part 1: Shopping list

### For each box

| Item | What to ask for in the shop / online | Approx. cost (₹) |
|---|---|---|
| ESP32 board | "ESP32 DevKit V1" or "ESP32-WROOM-32 development board", 30 or 38 pins, **with pins already soldered** | 350–450 |
| Temperature + humidity sensor | "DHT22 module" (the small board version with 3 pins, not the bare sensor with 4 legs) | 180–250 |
| Air quality sensor | "MQ-135 gas sensor module" (4 pins: VCC, GND, DO, AO) | 120–150 |
| Light sensor | "LDR light sensor module **with AO pin**" (4 pins). The 3-pin version won't work | 20–40 |
| Sound sensor | "KY-038 sound sensor module" or "microphone sound sensor module with AO pin" | 40–60 |
| Breadboard | "Half-size breadboard, 400 points" | 60–80 |
| Jumper wires | One pack "female-to-female" and one pack "male-to-female" (20 or 40 each) | 80–120 |
| Resistors | **Three 10 kΩ resistors** (brown-black-orange stripes) | 5–10 |
| USB cable | Micro-USB or USB-C, whichever your ESP32 has. Must be a **data** cable (see Step 4) | 50–100 |
| Power | Any phone charger, 5 V, 1 A or more | 100–200 |
| Enclosure box | Small plastic project box, roughly 15 × 10 × 6 cm | 100–150 |
| Mesh | A small piece of fine metal or plastic mesh (insect screen works) | 20 |

**No soldering needed** as long as you buy the ESP32 and modules with pins already attached.

### Tools

- A laptop that runs NestGuard: Windows 10/11 or a Mac (macOS 12 or newer)
- A phone
- Scissors or a craft knife, and a drill or hot nail to make holes in the plastic box
- Double-sided tape or hot glue
- Your Wi-Fi name and password

---

## Part 2: Prepare the laptop (once)

### Step 1. Make sure NestGuard runs

**Windows:** if you haven't yet, double-click `setup.bat` in the NestGuard folder. After that,
start it any time with `run.bat`.

**Mac:**

1. Open **Terminal** (press **Cmd + Space**, type `Terminal`, press Enter).
2. Type **bash** followed by a space, then drag the file **`setup.sh`** from the NestGuard
   folder in Finder into the Terminal window, and press **Enter**.
3. If it says **Python** or **Node.js** is missing, install it from the link it shows, then do
   step 2 again. (If you have Homebrew, it installs them for you.)
4. After that, start NestGuard any time the same way, with **`run.sh`** instead of `setup.sh`.
   Keep that Terminal window open while you use NestGuard; press **Ctrl + C** in it to stop.

Either way, the dashboard opens at <http://localhost:3000>.

### Step 2. Let the boxes reach your laptop

**Mac:** there's nothing to run. The first time `run.sh` starts, macOS may ask one or both of:

- *"Do you want the application "python3" to accept incoming network connections?"* Click
  **Allow**.
- *"Terminal would like to find and connect to devices on your local network."* Click **Allow**.

Clicked **Don't Allow** by accident? Fix it in **System Settings → Privacy & Security → Local
Network** (turn on Terminal) and **System Settings → Network → Firewall → Options** (set Python to
"Allow incoming connections"). Then skip to Step 3.

**Windows:** Windows blocks other devices from talking to your laptop by default. **`setup.bat` fixes this for
you:** near the end it shows a Windows prompt asking *"Do you want to allow this app to make
changes to your device?"*. Click **Yes**. It ends with:

```
[ok] Firewall allows NestGuard boxes on the local network
```

If you clicked No by accident, just run `setup.bat` again. `run.bat` also reminds you while this
isn't done.

> **If Windows ever shows "Windows Defender Firewall has blocked some features of Python"**, click
> **Allow access**. Never click Cancel there: that tells Windows to block NestGuard, and the boxes
> won't be able to reach the laptop.

### Step 3. Your friend's laptop

Do Step 1 and Step 2 on your friend's laptop too: copy the NestGuard folder over (or download it
again), run `setup.bat` (Windows) or `setup.sh` (Mac), and allow the prompts. That's everything.
No Arduino, no settings, no addresses. A Windows laptop and a Mac can share the same boxes.

---

## Part 3: Install the Arduino program (once)

Arduino IDE is the free program that copies the NestGuard code onto the ESP32 board.

### Step 4. Install Arduino IDE and connect the board

1. Download **Arduino IDE 2** from <https://www.arduino.cc/en/software> and install it.
   - **Windows:** pick the Windows installer. Say **Yes / Install** to any driver pop-ups.
   - **Mac:** pick **macOS Apple Silicon** (M1/M2/M3/M4 Macs) or **macOS Intel** (older Macs;
     check Apple menu → About This Mac). Open the downloaded file and drag Arduino IDE into
     **Applications**.
2. Plug the ESP32 into the laptop with the USB cable. A small red light on the board turns on.
3. Open Arduino IDE. Go to **Tools → Port**. Your board shows up as:
   - **Windows:** a port such as **COM3** or **COM5**.
   - **Mac:** a port such as **/dev/cu.usbserial-0001**, **/dev/cu.SLAB_USBtoUART** or
     **/dev/cu.wchusbserial...**. Never pick one with *Bluetooth* in its name.

   Unplug the board and check the menu again: the one that disappears is your board.

**No port appears?**

- Try another USB cable. Many cables only charge and can't carry data. This is the most common
  problem.
- You may need a driver. Look at the small chip next to the USB socket on the board:
  - It says **CP2102** or **CP210x**: install the "CP210x USB to UART Bridge VCP Drivers" from
    Silicon Labs.
  - It says **CH340** or **CH9102**: install the "CH340 driver" from WCH (wch-ic.com).

  Download the Windows or macOS version to match your laptop. Recent Macs usually need no driver
  at all. On a Mac, if the install says the software was blocked, open **System Settings →
  Privacy & Security**, click **Allow** next to the message, and restart the Mac. Restart Arduino
  IDE after installing.

### Step 5. Add ESP32 support and the three libraries

1. **File → Preferences**. In **Additional boards manager URLs**, paste:

   ```
   https://espressif.github.io/arduino-esp32/package_esp32_index.json
   ```

   Click **OK**.
2. **Tools → Board → Boards Manager**. Search **esp32**. Install **"esp32 by Espressif
   Systems"**. This downloads a lot; give it a few minutes.
3. **Tools → Manage Libraries**. Search **DHT sensor library**, install the one **by Adafruit**.
   When it asks about extra dependencies, click **Install all**.
4. Still in Manage Libraries, search **ArduinoJson**, install the one **by Benoit Blanchon**
   (version 7 or newer).
5. Still in Manage Libraries, search **WiFiManager**, install the one **by tzapu** (version 2 or
   newer). This is what lets you set the Wi-Fi from your phone.

That's all the software. You never need to do Part 3 again.

---

## Part 4: Wire the box

**Unplug the USB cable while you wire.** Plug it back in only when everything is connected.

### Things to know first

**The ESP32's pins have names printed next to them.** The same pin may be labelled differently
on different boards:

| This guide says | Your board might print |
|---|---|
| **3V3** | 3V3, 3.3V |
| **VIN** | VIN, 5V |
| **GND** | GND (there are several, any one works) |
| **D4** | D4, G4, IO4, GPIO4, or just 4 |
| **D32**, **D34**, **D35** | same pattern: D34, G34, IO34, 34 ... |

**How a breadboard works.** In the middle, each short row of 5 holes is connected inside, so
anything plugged into the same row is joined. Along each long edge there are two long lines
marked **+** (red) and **–** (blue): every hole along that line is joined. We use one red line as
the power strip and the blue line next to it as the ground strip.

**Wire colours** don't matter electrically, but they help you avoid mistakes. Use **red** for
power, **black** for ground, any other colour for signals.

### Step 6. Make the power strip

| From (ESP32) | To (breadboard) | Wire |
|---|---|---|
| **3V3** | Red **+** line | Red, male-to-female |
| **GND** | Blue **–** line next to it | Black, male-to-female |

Now every sensor can take power from the red line and ground from the blue line.

### Step 7. Connect the sensors

Each sensor has its pins labelled on the board. Connect them like this.

**Temperature + humidity (DHT22)**

| Sensor pin | Goes to |
|---|---|
| **+** (or VCC) | Red **+** line |
| **–** (or GND) | Blue **–** line |
| **out** (or DAT, S) | ESP32 **D4** |

**Sound sensor**

| Sensor pin | Goes to |
|---|---|
| **+** (or VCC) | Red **+** line |
| **G** (or GND) | Blue **–** line |
| **AO** | ESP32 **D32** |
| **DO** | Nothing, leave it empty |

**Light sensor (LDR)**

| Sensor pin | Goes to |
|---|---|
| **VCC** | Red **+** line |
| **GND** | Blue **–** line |
| **AO** | ESP32 **D35** |
| **DO** | Nothing, leave it empty |

**Air quality (MQ-135): this one is different, read carefully**

The MQ-135 has a small heater inside that needs more power (5 V), and its signal can be stronger
than the ESP32 can safely take. So it gets power from **VIN** instead of the red line, and its
signal passes through three resistors that reduce it to a safe level.

| Sensor pin | Goes to |
|---|---|
| **VCC** | ESP32 **VIN** directly (female-to-female wire) |
| **GND** | Blue **–** line |
| **DO** | Nothing, leave it empty |
| **AO** | Breadboard **row 10** (any free row works, the numbers are just an example) |

Then, on the breadboard:

1. **Resistor 1:** one leg in **row 10**, the other leg in **row 15**.
2. **Resistor 2:** one leg in **row 15**, the other leg in **row 20**.
3. **Resistor 3:** one leg in **row 20**, the other leg in the blue **–** line.
4. **Wire:** from **row 15** to ESP32 **D34**.

Resistors have no front or back; either way round works.

> **Never connect the MQ-135's AO straight to the ESP32.** Over time that can damage the board.

### Step 8. Check before you power on

Go through this list with your finger on each wire:

- [ ] ESP32 **3V3** → red line, ESP32 **GND** → blue line
- [ ] DHT22: + red, – blue, out → **D4**
- [ ] Sound: + red, G blue, AO → **D32**
- [ ] Light: VCC red, GND blue, AO → **D35**
- [ ] MQ-135: VCC → **VIN**, GND blue, AO → row 10, resistors 10→15→20→blue, row 15 → **D34**
- [ ] No sensor's VCC/+ goes to a GND/blue hole (this is the mistake that breaks things)

---

## Part 5: Load the program onto the box

### Step 9. Get the NestGuard program into Arduino IDE

A new ESP32 is blank. It needs the NestGuard program to know how to read the sensors and where to
send the readings. The full program is in the
[appendix at the end of this guide](#appendix-the-nestguard-program), and the same code is in the
NestGuard folder as `firmware/nestguard/nestguard.ino`. Use whichever way is easier:

**Option A: open the file** (if you have the NestGuard folder on this laptop)

In Arduino IDE: **File → Open**, go to the NestGuard folder, open
`firmware/nestguard/nestguard.ino`.

**Option B: copy and paste it from this guide**

1. In Arduino IDE: **File → New Sketch**. A window opens with a few lines of starter code.
2. Click inside the code, select everything (**Ctrl + A** on Windows, **Cmd + A** on Mac) and
   delete it, so the window is completely empty.
3. Scroll down to the [appendix](#appendix-the-nestguard-program), copy the **whole** code block
   (on GitHub, the copy button at the top-right corner of the block copies all of it), and paste
   it into the empty window.
4. **File → Save As**, name it `nestguard`, click **Save**. Arduino IDE puts it in a folder with
   the same name; that's normal and required.

Either way, you now see the program in Arduino IDE. You only change one line of it, in the next
step.

### Step 10. Tell the program which box this is

Near the top you'll see this block. The **only** thing to change is the box name inside the
quotes on the first line:

```cpp
const char *ENCLOSURE_ID = "COOP1";     // HIVE1, COOP1 or SHED1
const char *API_KEY = "dev-local-key";  // leave as it is
const char *FIXED_BACKEND_URL = "";     // leave empty
```

| Box | ENCLOSURE_ID | Already on the dashboard? |
|---|---|---|
| Beehive | `HIVE1` | Yes |
| Chicken coop | `COOP1` | Yes |
| Livestock shelter | `SHED1` | No: first click **Register box** on the dashboard and pick it |

No Wi-Fi name, no password, no laptop address. The box asks for the Wi-Fi in Step 12 and finds
the laptop on its own.

### Step 11. Upload

1. Plug the board in with the USB cable.
2. **Tools → Board → esp32 → ESP32 Dev Module**.
3. **Tools → Port →** your board's port from Step 4 (COM... on Windows, /dev/cu... on a Mac).
4. Click the **→ (Upload)** arrow button at the top left.
5. Wait. The bottom panel shows progress. It ends with **"Hard resetting via RTS pin..."**. That
   means it worked.

**Stuck on `Connecting......_____`?** Press and hold the **BOOT** button on the board until the
percentage starts climbing, then let go.

---

## Part 6: Check that it works

### Step 12. Give the box your Wi-Fi (from your phone)

1. Make sure NestGuard is running on the laptop (`run.bat` on Windows, `run.sh` on a Mac).
2. Optional but handy: in Arduino IDE open **Tools > Serial Monitor** and set the speed in its
   bottom-right corner to **115200 baud**. You'll see what the box is doing.
3. With the box powered (USB cable or charger), open your **phone's Wi-Fi settings**. Within about
   30 seconds a network called **`NestGuard-COOP1`** (your box's name) appears. Connect to it. It
   has no password.
4. A setup page opens by itself. If it doesn't, open the phone's browser and go to
   **`192.168.4.1`**.
5. Tap **Configure WiFi**, tap **your home Wi-Fi** in the list, type its **password**, tap **Save**.
6. The box restarts and joins your Wi-Fi, and the `NestGuard-COOP1` network disappears. Your phone
   goes back to your normal Wi-Fi.

> **The ESP32 only works with 2.4 GHz Wi-Fi.** If your router shows two names (e.g. `MyHome` and
> `MyHome-5G`), pick the one **without** 5G. If you use a phone hotspot, turn on "Maximise
> compatibility" (iPhone) or set the band to 2.4 GHz (Android).

You only do this once per Wi-Fi network. After a power cut the box reconnects on its own.

### Step 13. Watch the box talk

Within a minute the Serial Monitor shows something like:

```
NestGuard box COOP1 starting
Connected to "MyHome", box IP: 192.168.1.57
Looking for the NestGuard laptop...
Found NestGuard at http://192.168.1.23:8000
temp=27.4C humidity=61.0% airQuality=1240 light=530 sound=610
POST http://192.168.1.23:8000/enclosures/COOP1/readings -> 200
```

**`-> 200` means it worked.** On the dashboard the box's panel switches from "Waiting for first
reading" to live numbers. No Serial Monitor open? Just watch the dashboard.

If something's wrong, the Serial Monitor tells you:

| You see | Meaning | Fix |
|---|---|---|
| No `NestGuard-COOP1` network on the phone | Box still trying a saved Wi-Fi, or not powered | Wait a minute. Still nothing: hold the **BOOT** button for 5 seconds to make the box forget its Wi-Fi |
| The hotspot comes back after you saved | Wrong password, or a 5 GHz network | Redo Step 12 carefully, pick the 2.4 GHz network |
| `No NestGuard laptop answered` | Box is on Wi-Fi but no laptop replied | Is `run.bat` / `run.sh` running? Is the laptop on the **same** Wi-Fi? Windows: did Step 2 end with `[ok]`? Mac: did you click **Allow** in Step 2? |
| `-> -1` a few times, then `searching for NestGuard again` | Laptop went away (closed, asleep, other Wi-Fi) | Start `run.bat` / `run.sh`; the box finds it again by itself |
| `-> 404` | This box isn't registered | Register it on the dashboard, or check the ENCLOSURE_ID spelling |
| `-> 401`, or `Ignored an answer ... failed verification` | Box and laptop use different keys | The box's `API_KEY` must match `API_KEY` in `backend/.env` |
| `DHT22 read failed` | Temperature sensor not answering | Check the DHT22's 3 wires, especially **out > D4** |
| Air quality very high for the first few minutes | MQ-135 warming up | Normal, see "About the air sensor" |

Once you see `-> 200`, unplug the box. It's ready to install.

---

## Part 7: Install it in the enclosure

### Step 14. Pack the box

1. Make a few holes in the plastic box (6–8 mm) on two sides so air flows through. The
   temperature, air and sound sensors all need outside air.
2. Glue or tape **mesh** over the holes from the inside. It keeps out insects, dust and beaks.
3. Fix the ESP32 and breadboard inside with double-sided tape. Point the light sensor towards a
   hole so it can "see" out.
4. Make one hole for the USB cable.

### Step 15. Place it

**Everywhere:**

- Out of **direct sun** (it would read the sun's heat, not the enclosure's) and away from **rain
  and water bowls**.
- Out of reach of animals that peck or chew. Run the cable along the wall, up high, in a cable
  cover if possible.
- Within reach of your **Wi-Fi**. Before closing everything up, power the box in its final spot
  and check its panel on the dashboard keeps updating.
- Power from the phone charger. Outdoors, keep the plug and any extension lead in a dry, covered
  place.

**Chicken coop:** on a wall at about the height of the roosting bars, away from the heat lamp and
the waterer. Chickens peck at anything shiny; the mesh matters here.

**Beehive:** bees cover anything inside the hive with wax and propolis. Keep the box **outside the
brood area**: under the roof, on top of the inner cover, so it measures the air coming up from the
hive. Wear protective gear and work calmly, as for any hive inspection.

**Livestock shelter:** high on a wall, out of reach. Rabbits and goats chew cables, so protect the
cable all the way down.

### Step 16. Repeat for the other boxes

Build the next box the same way (Part 4), change only `ENCLOSURE_ID` in Step 10, and give it the
Wi-Fi in Step 12. Parts 2 and 3 don't need repeating.

---

## Daily use

- **Keep the laptop on, connected to the same Wi-Fi, with `run.bat` / `run.sh` running.** The
  dashboard only works while it runs.
- **Stop the laptop from sleeping** while plugged in:
  - **Windows:** **Settings → System → Power → Screen and sleep → "When plugged in, put my device
    to sleep after" → Never.**
  - **Mac:** `run.sh` keeps the Mac awake by itself while it runs. Just keep the **lid open**:
    closing it puts the Mac to sleep anyway.
- **The boxes look after themselves.** After a power cut they restart and reconnect on their own.
  It doesn't matter whether the laptop or the boxes start first.
- **If the laptop is off,** the boxes keep trying. Readings taken during that time are lost, and
  the dashboard carries on as soon as the laptop is back.
- **Offline warning:** if a box stops reporting for 5 minutes, its panel says **Offline**. Check
  its power and Wi-Fi.
- **Check from your phone:** on the same Wi-Fi, open the laptop's address with `:3000` in the
  phone's browser. The address is in the box's Serial Monitor: "Found NestGuard at
  http://192.168.1.23:8000" means `http://192.168.1.23:3000`.
- **Don't press "Run simulation" once real boxes are installed.** It's a demo: it wipes all
  stored readings and alerts, shows made-up data for 2 minutes, then empties every box again.

### Switching laptops (yours and your friend's)

1. Stop NestGuard on the old laptop. Windows: close the two `run.bat` windows. Mac: press
   **Ctrl + C** in the `run.sh` Terminal window, or close it.
2. Start `run.bat` / `run.sh` on the other laptop, on the **same Wi-Fi**.
3. Wait. Within about 2 minutes each box notices the old laptop is gone, looks again, and finds
   the new one. Nothing to do on the boxes.

Things to know:

- **Run NestGuard on one laptop at a time.** If both run on the same Wi-Fi, each box reports to
  whichever laptop answers first, and the readings end up split between them.
- **Each laptop keeps its own history.** Readings sent to your laptop don't show up on your
  friend's, and the other way round.
- **The laptop's address can change** (e.g. after a router restart). That's fine: the boxes find it
  again by themselves.

### Taking the boxes to a different place (another Wi-Fi)

Plug the box in at the new place. When it can't find its old Wi-Fi, it opens the
`NestGuard-COOP1` network again after about a minute: redo Step 12 with the new Wi-Fi. A box
remembers **one** Wi-Fi at a time, so you'll redo Step 12 when you bring it back.

**College, hostel and office Wi-Fi** often stop devices from talking to each other. The box
joins, but never finds the laptop (`No NestGuard laptop answered`). Use a **phone hotspot**
instead: connect the laptop to it, and give the box the hotspot in Step 12 (2.4 GHz, see the note
in Step 12).

---

## About the air sensor

- **First use:** leave a new MQ-135 powered for **24 hours** before trusting it. Brand-new
  sensors read too high until they "burn in".
- **Every start:** it needs about **3 minutes** to warm up. High readings right after power-on
  are normal.
- **Its numbers are relative**, not a precise measurement. The dashboard's air limits (watch from
  1800, danger from 2600) are starting points. After a week, note what your box reads on a normal,
  fresh day, and ask whoever maintains the software to adjust the limits in
  `backend/app/devices.py`.

---

## Good to know

- **The NestGuard program for the box hasn't been tested on real hardware yet.** Build one box,
  get `-> 200` in Step 12, and leave it running for a day before building the rest.
- **Safe ranges per animal** (the dashboard warns from these temperatures):

  | Box | Watch | Danger |
  |---|---|---|
  | Beehive | 37 °C | 39 °C |
  | Chicken coop | 30 °C | 35 °C |
  | Livestock shelter | 28 °C | 32 °C |

- **Everything stays in your home.** The boxes only talk to your laptop over your Wi-Fi.

---

## Appendix: the NestGuard program

This is the program that goes onto every ESP32 (Step 9). It's the same as
`firmware/nestguard/nestguard.ino` in the NestGuard folder; if the two ever differ, use the file.
Copy **all** of it, from the first `/*` to the last `}`. The only line you change is
`ENCLOSURE_ID` (Step 10).

```cpp
/*
 * NestGuard: ESP32 sensor box firmware (plug and play)
 *
 * Reads DHT22 (temperature/humidity), MQ-135 (air quality), LDR (light) and a
 * sound sensor, and POSTs a JSON reading to the NestGuard laptop every
 * POST_INTERVAL_MS.
 *
 * Nothing about the network is hard-coded:
 *   - Wi-Fi: on first start, or when no saved Wi-Fi is in range, the box opens
 *     its own hotspot "NestGuard-<ENCLOSURE_ID>". Join it from a phone, pick
 *     the Wi-Fi, type the password; the box remembers it. Holding the BOOT
 *     button for 5 seconds forgets the saved Wi-Fi and reopens the hotspot.
 *   - Laptop: the box broadcasts "NESTGUARD_DISCOVER <nonce>" on UDP
 *     DISCOVERY_PORT and whichever laptop runs NestGuard answers
 *     (backend/app/discovery.py) with an HMAC-SHA256 proof keyed by API_KEY.
 *     Answers whose proof doesn't check out are ignored, so another device on
 *     the Wi-Fi can't pose as NestGuard and collect readings or the key.
 *     If posting fails a few times in a row, it searches again, so switching
 *     laptops or a new laptop IP sorts itself out.
 *
 * NOT FLASH-TESTED: there was no physical ESP32 available when this was
 * written. See docs/HARDWARE_GUIDE.md for wiring and setup.
 *
 * Libraries (Arduino IDE > Tools > Manage Libraries):
 *   - "DHT sensor library" by Adafruit (accept "Adafruit Unified Sensor")
 *   - "ArduinoJson" by Benoit Blanchon, version 7+
 *   - "WiFiManager" by tzapu, version 2+
 * Board support: Boards Manager > "esp32" by Espressif Systems.
 *
 * Wiring (ESP32 ADC1 pins only; ADC2 conflicts with Wi-Fi):
 *   DHT22 data   -> GPIO4
 *   MQ-135 AOUT  -> GPIO34 through a 10k / 20k voltage divider (the module runs
 *                   on 5V from VIN, and its output can exceed the ESP32's 3.3V)
 *   LDR AOUT     -> GPIO35
 *   Sound AOUT   -> GPIO32
 *   DHT22, LDR, sound VCC -> 3V3. MQ-135 VCC -> VIN (5V). All GND -> GND.
 */

#include <WiFi.h>
#include <WiFiUdp.h>
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include "mbedtls/md.h"  // HMAC, part of the ESP32 board package

// ---- Set once per box, before uploading ----
const char *ENCLOSURE_ID = "COOP1";     // HIVE1, COOP1 or SHED1
const char *API_KEY = "dev-local-key";  // must match backend/.env's API_KEY
// Leave empty so the box finds the laptop by itself. Only fill in, e.g.
// "http://192.168.137.1:8000", on networks that block discovery.
const char *FIXED_BACKEND_URL = "";
// ---------------------------------------------

#define DHT_PIN 4
#define DHT_TYPE DHT22
#define MQ135_PIN 34
#define LDR_PIN 35
#define SOUND_PIN 32
#define BOOT_PIN 0

#define POST_INTERVAL_MS 30000
#define DISCOVERY_PORT 47800
#define DISCOVERY_TIMEOUT_MS 2000
#define RETRY_DELAY_MS 5000
#define MAX_FAILED_POSTS 3
#define WIFI_RESET_HOLD_MS 5000
#define SETUP_HOTSPOT_TIMEOUT_S 180  // then restart and try the saved Wi-Fi again

DHT dht(DHT_PIN, DHT_TYPE);
WiFiUDP udp;

String backendUrl;  // "http://<laptop ip>:<port>", empty until discovered
int failedPosts = 0;
unsigned long lastPostAt = 0;
bool hasPosted = false;
unsigned long bootPressedAt = 0;

void connectWiFi() {
  WiFiManager wm;
  wm.setConfigPortalTimeout(SETUP_HOTSPOT_TIMEOUT_S);
  String hotspot = String("NestGuard-") + ENCLOSURE_ID;
  Serial.printf("Joining saved Wi-Fi, or opening setup hotspot \"%s\"...\n", hotspot.c_str());
  if (!wm.autoConnect(hotspot.c_str())) {
    Serial.println("No Wi-Fi set up in time. Restarting to try again.");
    ESP.restart();
  }
  Serial.printf("Connected to \"%s\", box IP: %s\n", WiFi.SSID().c_str(), WiFi.localIP().toString().c_str());
}

// Hex HMAC-SHA256 of message, keyed with API_KEY. Must match discovery.proof().
String hmacHex(const String &message) {
  unsigned char digest[32];
  mbedtls_md_context_t ctx;
  mbedtls_md_init(&ctx);
  mbedtls_md_setup(&ctx, mbedtls_md_info_from_type(MBEDTLS_MD_SHA256), 1);
  mbedtls_md_hmac_starts(&ctx, (const unsigned char *)API_KEY, strlen(API_KEY));
  mbedtls_md_hmac_update(&ctx, (const unsigned char *)message.c_str(), message.length());
  mbedtls_md_hmac_finish(&ctx, digest);
  mbedtls_md_free(&ctx);

  char hex[65];
  for (int i = 0; i < 32; i++) sprintf(hex + 2 * i, "%02x", digest[i]);
  return String(hex);
}

// Asks the network where NestGuard is. True once backendUrl is set.
bool discoverBackend() {
  if (strlen(FIXED_BACKEND_URL) > 0) {
    backendUrl = FIXED_BACKEND_URL;
    return true;
  }

  // Fresh random nonce per search, so an old answer can't be replayed.
  char nonce[17];
  snprintf(nonce, sizeof(nonce), "%08lx%08lx", (unsigned long)esp_random(), (unsigned long)esp_random());

  Serial.println("Looking for the NestGuard laptop...");
  udp.beginPacket(WiFi.broadcastIP(), DISCOVERY_PORT);
  udp.print("NESTGUARD_DISCOVER ");
  udp.print(nonce);
  udp.endPacket();

  unsigned long start = millis();
  while (millis() - start < DISCOVERY_TIMEOUT_MS) {
    if (udp.parsePacket() > 0) {
      char reply[128];
      int len = udp.read(reply, sizeof(reply) - 1);
      reply[len > 0 ? len : 0] = '\0';

      int port = 0;
      char proof[65] = {0};
      if (sscanf(reply, "NESTGUARD_HERE %d %64s", &port, proof) == 2) {
        String sender = udp.remoteIP().toString();
        String expected = hmacHex(String(nonce) + ":" + String(port) + ":" + sender);
        if (expected.equals(proof)) {
          backendUrl = "http://" + sender + ":" + String(port);
          Serial.printf("Found NestGuard at %s\n", backendUrl.c_str());
          return true;
        }
        Serial.printf("Ignored an answer from %s that failed verification (wrong API_KEY?)\n", sender.c_str());
      }
    }
    delay(10);
  }
  Serial.println("No NestGuard laptop answered. Is run.bat / run.sh running on a laptop on this Wi-Fi?");
  return false;
}

// Holding BOOT for WIFI_RESET_HOLD_MS forgets the Wi-Fi and reopens the setup hotspot.
void checkWiFiResetButton() {
  if (digitalRead(BOOT_PIN) != LOW) {
    bootPressedAt = 0;
    return;
  }
  if (bootPressedAt == 0) {
    bootPressedAt = millis();
  } else if (millis() - bootPressedAt >= WIFI_RESET_HOLD_MS) {
    Serial.println("BOOT held: forgetting saved Wi-Fi and restarting into setup mode.");
    WiFiManager wm;
    wm.resetSettings();
    delay(500);
    ESP.restart();
  }
}

int postReading(float temperature, float humidity, int airQuality, int light, int sound) {
  JsonDocument doc;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["airQuality"] = airQuality;
  doc["light"] = light;
  doc["sound"] = sound;

  String body;
  serializeJson(doc, body);

  String url = backendUrl + "/enclosures/" + ENCLOSURE_ID + "/readings";
  HTTPClient http;
  http.setTimeout(5000);
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", API_KEY);

  int statusCode = http.POST(body);
  Serial.printf("POST %s -> %d\n", url.c_str(), statusCode);
  http.end();
  return statusCode;
}

void readAndPost() {
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  int airQuality = analogRead(MQ135_PIN);
  int light = analogRead(LDR_PIN);
  int sound = analogRead(SOUND_PIN);

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("DHT22 read failed, skipping this cycle. Check the DHT22 wiring (data -> GPIO4).");
    return;
  }
  Serial.printf("temp=%.1fC humidity=%.1f%% airQuality=%d light=%d sound=%d\n",
                temperature, humidity, airQuality, light, sound);

  int statusCode = postReading(temperature, humidity, airQuality, light, sound);
  if (statusCode > 0) {
    failedPosts = 0;
    if (statusCode == 404) Serial.println("This box isn't registered: register it on the dashboard.");
    if (statusCode == 401) Serial.println("API key mismatch with backend/.env.");
  } else if (++failedPosts >= MAX_FAILED_POSTS) {
    Serial.println("Laptop unreachable, searching for NestGuard again.");
    backendUrl = "";
    failedPosts = 0;
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(BOOT_PIN, INPUT_PULLUP);
  dht.begin();
  Serial.printf("\nNestGuard box %s starting\n", ENCLOSURE_ID);
  connectWiFi();
  udp.begin(DISCOVERY_PORT);
}

void loop() {
  checkWiFiResetButton();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi dropped, reconnecting...");
    WiFi.reconnect();
    delay(RETRY_DELAY_MS);
    return;
  }

  if (backendUrl.isEmpty() && !discoverBackend()) {
    delay(RETRY_DELAY_MS);
    return;
  }

  if (hasPosted && millis() - lastPostAt < POST_INTERVAL_MS) {
    delay(50);
    return;
  }
  lastPostAt = millis();
  hasPosted = true;
  readAndPost();
}
```
