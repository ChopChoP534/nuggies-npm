const mongoose = require('mongoose');
mongoose.set('useFindAndModify', false);
let win;
const schema = require('../models/giveawayschema');
const { MessageButton } = require('discord-buttons');
const giveaways = require('./giveaways');
const merge = require('deepmerge');
const defaultManagerOptions = {
    dmWinner: true,
    giveaway: '🎉🎉 **GIVEAWAY MOMENT** 🎉🎉',
    giveawayDescription: '🎁 Prize: **${prize}**\n🎊 Hosted by: ${hostedBy}\n⏲️ Winner(s): \`{winners}\`\n\nRequirements: {requirements}',
    endedGiveawayDescription : '🎁 Prize: **{prize}**\n🎊 Hosted by: ${hostedBy}\n⏲️ Winner(s): {winners}',
    giveawayFooterImage: 'https://cdn.discordapp.com/emojis/843076397345144863.png',
    winMessage: '{winners} you won {prize} Congratulations! Hosted by {hostedBy}',
	rerolledMessage: 'Rerolled! {winner} is the new winner of the giveaway!', // only {winner} placeholder
    toParticipate: '**Click the Enter button to enter the giveaway!**',
	newParticipant: 'You have successfully entered for this giveaway', // no placeholders | ephemeral
	alreadyParticipated: 'you already entered this giveaway!', // no placeholders | ephemeral
	nonoParticipants: 'There are not enough people in the giveaway!', // no placeholders
	nonoRole: 'You do not have the required role(s)\n{requiredRoles}\n for the giveaway!', // only {requiredRoles} | ephemeral
    dmMessage: 'You have won a giveaway in **{guildName}**!\nPrize: [{prize}]({giveawayURL})',
    noWinner: 'Not enough people participated in this giveaway.', // no {winner} placerholder
    alreadyEnded: 'The giveaway has already ended!', // no {winner} placeholder
    dropWin: '{winner} Won The Drop!!' // only {winner} placeholder
}
class main {
/**
	*
	* @param {string} url - MongoDB connection URI.
	*/
	static async connect(url) {
		if (!url) throw new TypeError('NuggiesError: You didn\'t provide a MongoDB connection string');
		return mongoose.connect(url, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});
	}
	static async baseOptions(client, options) {
		this.client = client
		client.giveawayMessages = merge(defaultManagerOptions, options);			
	}
	static async buttonclick(client, button) {
		if (!client) throw new Error('NuggiesError: client not provided');
		if (!button) throw new Error('NuggiesError: button not provided');
		await button.clicker.fetch();
		const id = button.id;
		if (id.startsWith('giveaways')) {
			const tag = id.split('-');
			if (tag[1] === 'enter') {
				const data = await schema.findOne({ messageID: button.message.id });
				if (data.requirements.enabled == true) {
					if (data.clickers.includes(button.clicker.user.id)) { return button.reply.send(client.giveawayMessages.alreadyParticipated, true); }
					const roles = data.requirements.roles.map(x => button.message.guild.members.cache.get(button.clicker.user.id).roles.cache.get(x));
					if (!roles[0]) {
						const requiredRoles = button.message.guild.roles.cache.filter(x => data.requirements.roles.includes(x.id)).filter(x => !button.message.guild.members.cache.get(button.clicker.user.id).roles.cache.get(x.id)).array().map(x => `\`${x.name}\``).join(', ')
						return button.reply.send(client.giveawayMessages.nonoRole.replace(/{requiredRoles}/g, requiredRoles), true);
					}
				}
				if (!data.clickers.includes(button.clicker.user.id)) {
					data.clickers.push(button.clicker.user.id);
					data.save();
					return button.reply.send(client.giveawayMessages.newParticipant, true);
				}
				if (data.clickers.includes(button.clicker.user.id)) {
					return button.reply.send(client.giveawayMessages.alreadyParticipated, true);
				}
			}
			if (tag[1] === 'reroll') {
				if (button.clicker.user.id !== tag[2]) return button.reply.send('You Cannot End This Giveaway, Only Hoster Can', { ephemeral: true });
				try {
					button.reply.send('Rerolled!', true);
					win = await giveaways.reroll(client, button.message.id);
				}
				catch (err) {
					console.log(err);
					return button.message.channel.send('⚠️ **Unable To Find That Giveaway**');
				}
				if (!win.length) return button.message.channel.send(client.giveawayMessages.nonoParticipants);
				button.message.channel.send(client.giveawayMessages.rerolledMessage.replace(/{winner}/g, `<@${win}>`), { component: new MessageButton().setLabel('Giveaway').setURL(`https://discord.com/channels/${button.message.guild.id}/${button.message.channel.id}/${button.message.id}`).setStyle('url') });
			}
			if (tag[1] === 'end') {
				button.reply.defer()
				if (button.clicker.user.id !== tag[2]) return button.reply.send('You Cannot End This Giveaway, Only Hoster Can', { ephemeral: true });
				await giveaways.endByButton(client, button.message.id, button);
			}
		}
		if (button.id.startsWith('br')) {
			let member;
			const fetchMem = await button.guild.members.fetch(button.clicker.member.id, false);
			if (fetchMem) member = button.guild.members.cache.get(button.clicker.member.id);
			await member.fetch(true);
			const role = id.split(':')[1];
			if (button.clicker.member.roles.cache.has(role)) {
				button.clicker.member.roles.remove(role);
				button.reply.send(`I have removed the <@&${role}> role from you!`, true);
			}
			else {
				button.clicker.member.roles.add(role);
				button.reply.send(`I have added the <@&${role}> role to you!`, true);
			}
		}
	}
	static async dropclick(client, menu) {
		if (!client) throw new Error('NuggiesError: client not provided');
		if (!menu) throw new Error('NuggiesError: button not provided');
		await menu.clicker.fetch();
		if(menu.id == 'dr') {
			let member;
			const fetchMem = await menu.guild.members.fetch(menu.clicker.member.id, false);
			if (fetchMem) member = menu.guild.members.cache.get(menu.clicker.member.id);
			await member.fetch(true);
			const role = menu.values[0];
			if (menu.clicker.member.roles.cache.has(role)) {
				menu.clicker.member.roles.remove(role);
				menu.reply.send(`I have removed the <@&${role}> role from you!`, true);
			}
			else {
				menu.clicker.member.roles.add(role);
				menu.reply.send(`I have added the <@&${role}> role to you!`, true);
			}
		}
	}
}
module.exports = main;
