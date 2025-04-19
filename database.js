import { world, system, Player } from "@minecraft/server";

// ─────────────────────────────
// ระบบฐานข้อมูล (เฉพาะ player เท่านั้น)
// ─────────────────────────────
const KEY = "list";

const db = {
  _load() {
    try {
      const raw = world.getDynamicProperty(KEY);
      return raw && typeof raw === "string" ? JSON.parse(raw) : [];
    } catch (error) {
      console.warn(`Failed to load DB: ${error}`);
      return [];
    }
  },

  _save(data) {
    try {
      if (!Array.isArray(data)) throw new Error("Data must be an array");
      world.setDynamicProperty(KEY, JSON.stringify(data));
    } catch (error) {
      console.warn(`Failed to save DB: ${error}`);
    }
  },

  has(name) {
    if (typeof name !== "string") return false;
    const data = this._load();
    return data.includes(name);
  },

  add(name) {
    if (typeof name !== "string") return;
    const data = this._load();
    if (!data.includes(name)) {
      data.push(name);
      this._save(data);
    }
  },

  delete(name) {
    if (typeof name !== "string") return;
    const data = this._load().filter((n) => n !== name);
    this._save(data);
  },

  list() {
    return this._load();
  },

  clear() {
    this._save([]);
  },

  // ─────────────────────────────
  // ฟังก์ชันแยกการทำงานของคำสั่ง
  // ─────────────────────────────
  showHelp(player) {
    player.sendMessage(`[DB COMMANDS]
+set <player>     - เพิ่มผู้เล่น
+get <player>     - ตรวจสอบผู้เล่น
+del <player>     - ลบผู้เล่น
+list             - รายชื่อผู้เล่น
+clear            - ล้างทั้งหมด
+json             - แสดงข้อมูล JSON ของฐานข้อมูล`);
  },

  addPlayer(player, name) {
    if (db.has(name)) {
      player.sendMessage(`ผู้เล่น ${name} อยู่ในระบบแล้ว`);
    } else {
      db.add(name);
      player.sendMessage(`เพิ่มผู้เล่น ${name} แล้ว`);
    }
  },

  getPlayer(player, name) {
    const exists = db.has(name);
    player.sendMessage(exists ? `พบผู้เล่น ${name}` : `ไม่พบผู้เล่น ${name}`);
  },

  deletePlayer(player, name) {
    if (db.has(name)) {
      db.delete(name);
      player.sendMessage(`ลบผู้เล่น ${name} แล้ว`);
    } else {
      player.sendMessage("ไม่พบผู้เล่นนี้");
    }
  },

  listPlayers(player) {
    const names = db.list();
    player.sendMessage(
      names.length > 0 ? `ผู้เล่นทั้งหมด: ${names.join(", ")}` : "ไม่มีผู้เล่นในระบบ"
    );
  },

  clearPlayers(player) {
    db.clear();
    player.sendMessage("ล้างรายชื่อผู้เล่นทั้งหมดแล้ว");
  },

  showJson(player) {
    const data = db.list();
    console.warn("Database JSON: ", JSON.stringify(data, null, 2)); // แสดงข้อมูล JSON ในคอนโซล
    player.sendMessage("ข้อมูล JSON ของฐานข้อมูลถูกแสดงในคอนโซล");
  },

  // ─────────────────────────────
  // คำสั่งหลัก
  // ─────────────────────────────
  execute(player, cmd, args) {
    switch (cmd.toLowerCase()) {
      case "help":
        this.showHelp(player);
        break;
      case "set":
        this.addPlayer(player, args[0]);
        break;
      case "get":
        this.getPlayer(player, args[0]);
        break;
      case "del":
        this.deletePlayer(player, args[0]);
        break;
      case "list":
        this.listPlayers(player);
        break;
      case "clear":
        this.clearPlayers(player);
        break;
      case "json":
        this.showJson(player);
        break;
      default:
        player.sendMessage("ไม่พบคำสั่งนี้");
        break;
    }
  },
};

// ─────────────────────────────
// ตรวจจับคำสั่งจากแชท
// ─────────────────────────────
world.beforeEvents.chatSend.subscribe((ev) => {
  const player = ev.sender;
  if (!(player instanceof Player)) return;

  const msg = ev.message.trim();
  if (msg.startsWith("+")) {
    // เปลี่ยนจาก ! เป็น +
    ev.cancel = true;
    const [cmd, ...args] = msg.slice(1).split(" "); // เอาเครื่องหมาย + ออก
    db.execute(player, cmd.toLowerCase(), args);
  }
});

// ─────────────────────────────
// เพิ่มอัตโนมัติเมื่อผู้เล่นเข้าเกม
// ─────────────────────────────
world.afterEvents.playerSpawn.subscribe((ev) => {
  const player = ev.player;
  if (!ev.initialSpawn || !(player instanceof Player)) return;

  const name = player.name;
  if (!db.has(name)) {
    db.add(name);
    player.sendMessage(`ยินดีต้อนรับ ${name} สู่ระบบ`);
  }
});

// ─────────────────────────────
// ตรวจสอบผู้เล่นเมื่อสคริปต์เริ่มทำงาน
// ─────────────────────────────
system.run(() => {
  for (const player of world.getPlayers()) {
    if (!(player instanceof Player)) continue;
    const name = player.name;
    if (!db.has(name)) {
      db.add(name);
      player.sendMessage(`ระบบเพิ่มคุณเข้าในฐานข้อมูลเรียบร้อยแล้ว`);
    }
  }
});
