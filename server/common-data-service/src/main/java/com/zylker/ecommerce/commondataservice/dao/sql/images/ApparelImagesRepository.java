package com.zylker.ecommerce.commondataservice.dao.sql.images;

import com.zylker.ecommerce.commondataservice.entity.sql.images.ApparelImages;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ApparelImagesRepository extends JpaRepository<ApparelImages, Integer> {

    @Query(value = "SELECT DISTINCT c FROM ApparelImages c")
    List<ApparelImages> getAllData();
}
