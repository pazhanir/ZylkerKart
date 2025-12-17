package com.ujjaval.ecommerce.commondataservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.connection.RedisPassword;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.jedis.JedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;

import java.net.URI;
import java.net.URISyntaxException;

@Configuration
@Profile("prod")
public class ProdRedisConfig {

    @Bean
    public JedisConnectionFactory jedisConnectionFactory() {
        try {
            System.out.println("Loading Prod profile redis config....");
            String redistogoUrl = System.getenv("REDIS_URL");
            URI redistogoUri = new URI(redistogoUrl);

            RedisStandaloneConfiguration redisStandaloneConfiguration = new RedisStandaloneConfiguration();
            redisStandaloneConfiguration.setHostName(redistogoUri.getHost());
            redisStandaloneConfiguration.setPort(redistogoUri.getPort());
            redisStandaloneConfiguration.setPassword(RedisPassword.of(redistogoUri.getUserInfo().split(":", 2)[1]));

            return new JedisConnectionFactory(redisStandaloneConfiguration);

        } catch (URISyntaxException e) {
            e.printStackTrace();
            return null;
        }
    }

    @Bean
    public RedisTemplate<String, Object> redisTemplate() {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(jedisConnectionFactory());
        return template;
    }
}
