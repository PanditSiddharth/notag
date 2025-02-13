import { Telegraf, Context, MiddlewareFn } from "telegraf";
import mongoose, { Schema, model, Document } from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const bot = new Telegraf(process.env.BOT_TOKEN as string);

// 📌 **Mongoose Schema**
interface IUser extends Document {
  userId: number;
  reason: string;
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
  userId: { type: Number, required: true, unique: true },
  reason: { type: String, default: "No reason given" },
  createdAt: { type: Date, default: Date.now }
});

const User = model<IUser>("User", userSchema);

// 📌 **Connect to MongoDB**
mongoose.connect(process.env.MONGO_URI as string)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// 📌 **Middleware to Prevent Tagging**
const preventTagging: MiddlewareFn<Context> = async (ctx: any, next) => {
  if (!ctx.message) return next();
  
  const messageText = ctx.message.text || "";
  const entities = ctx.message.entities || [];
  const fromUser = ctx.message.from.id;
  
  // 🔍 **Check for Mentions (@username or reply)**
  const mentionedUserIds = entities
    .filter((e: any) => e.type === "mention" || e.type === "text_mention")
    .map((e: any) => e.user?.id)
    .filter((id: any) => id !== undefined) as number[];

  const replyUserId = ctx.message.reply_to_message?.from.id;
  if (replyUserId) mentionedUserIds.push(replyUserId);

  // 🚫 **Check if mentioned user is in "No Tag" List**
  const restrictedUsers = await User.find({ userId: { $in: mentionedUserIds } });

  if (restrictedUsers.length > 0) {
    await ctx.deleteMessage();
    const taggedUser = restrictedUsers[0]; // First found user
    return ctx.reply(
      `🚫 @${ctx.message.from.username || "User"} is not allowed to tag ${taggedUser.userId}!\n❗ Reason: ${taggedUser.reason}`,
      { reply_to_message_id: ctx.message.message_id }
    );
  }

  return next();
};


bot.start((ctx:any)=> {
    ctx.reply("Working..")
})
// 📌 **Commands**
bot.use(preventTagging);

bot.command("notag", async (ctx) => {
  const userId = ctx.message.from.id;
  const reason = ctx.message.text.split(" ").slice(1).join(" ") || "No reason given";

  const existingUser = await User.findOne({ userId });
  if (existingUser) {
    return ctx.reply("🚫 You are already in No Tag mode!");
  }

  await new User({ userId, reason }).save();
  return ctx.reply("✅ You are now in No Tag mode. Nobody can mention or reply to you!");
});

bot.command("yestag", async (ctx) => {
  const userId = ctx.message.from.id;

  const deletedUser = await User.findOneAndDelete({ userId });
  if (!deletedUser) {
    return ctx.reply("❌ You were not in No Tag mode.");
  }

  return ctx.reply("✅ You are now taggable again!");
});