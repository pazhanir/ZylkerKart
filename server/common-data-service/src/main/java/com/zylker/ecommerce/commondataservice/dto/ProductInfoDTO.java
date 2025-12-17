package com.zylker.ecommerce.commondataservice.dto;

import com.zylker.ecommerce.commondataservice.entity.sql.info.ProductInfo;
import lombok.*;

import java.io.Serializable;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class ProductInfoDTO implements Serializable {

    private Long totalCount;
    private List<ProductInfo> products;
}