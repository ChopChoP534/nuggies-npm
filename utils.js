const { MessageButton, MessageActionRow } = require('discord-buttons');
const schema = require('./models/giveawayschema');
module.exports.giveawayButtons = (hoster, raw = false, emojiid) => {
	const reroll = new MessageButton()
		.setLabel('Reroll')
		.setStyle('gray')
		.setID(`giveaways-reroll-${hoster}`)
		.setDisabled(true);
	const end = new MessageButton()
		.setLabel('End')
		.setStyle('red')
		.setID(`giveaways-end-${hoster}`);

	const enter = new MessageButton()
		.setLabel('Enter')
		.setStyle('green')
		.setEmoji(emojiid)
		.setID(`giveaways-enter-${hoster}`);
	const b = raw ? [end, enter, reroll] : new MessageActionRow().addComponents([end, enter, reroll]);
	return b;
};

module.exports.choose = async (winners, msgid) => {
	const data = await this.getByMessageID(msgid);
	console.log(data.clickers);
	if(winners > data.clickers.length + 1) return null;
	const final = [];
	// if (data.requirements.enabled == true) clickers = clickers.filter(x => this.checkRoles(x.id, data.requirements.roles, message));
	for (let i = 0; i < winners; i++) {
		if (!data.clickers[0]) return final[0] ? final : null;
		const win = data.clickers[Math.floor(Math.random() * data.clickers.length)];
		console.log(win);
		if (!win) return final[0] ? final : null;
		final.push(win);
	}
	return final[0] ? final : null;
};

module.exports.checkRole = (userID, roleIDs, message) => {
	let res;
	roleIDs.forEach((roleID) => {
		const role = message.guild.roles.cache.get(roleID);
		if (!message.guild.members.cache.get(userID).roles.cache.get(role.id)) res = false;
	});
	if (res == false) return res;
	res = true;
	return res;
};
module.exports.getByMessageID = async (messageID) => {
	const doc = await schema.findOne({ messageID: messageID });

	if (!doc) return;
	return doc;
};

module.exports.editButtons = async (client, data) => {
	const m = await client.guilds.cache.get(data.guildID).channels.cache.get(data.channelID).messages.fetch(data.messageID);
	const buttons = await this.giveawayButtons(data.hoster, true);
	buttons.find(x => x.label == 'End').setDisabled().setStyle('gray');
	buttons.find(x => x.label == 'Enter').setDisabled().setStyle('gray');
	buttons.find(x => x.label == 'Reroll').setDisabled(false).setStyle('green');
	const row = new MessageActionRow().addComponents(buttons);
	m.edit('', { components: [row], embed: m.embeds[0] }).catch((e) => { console.log('e' + e); });
};