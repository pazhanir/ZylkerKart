package com.zylker.ecommerce.commondataservice.dao.sql.categories;

import com.zylker.ecommerce.commondataservice.entity.sql.categories.ProductBrandCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ProductBrandCategoryRepository extends JpaRepository<ProductBrandCategory, Integer> {

    @Query(value = "SELECT p FROM ProductBrandCategory p")
    List<ProductBrandCategory> getAllData();

    ProductBrandCategory findByType(String brandName);
}
